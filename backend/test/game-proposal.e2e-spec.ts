import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'game-proposal.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('proposing a game (e2e)', () => {
    let app: INestApplication
    let database: Client

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const schema = readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

        execFileSync('sqlite3', [testDatabasePath], { input: schema, encoding: 'utf8' })
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted)
                VALUES
                    (1, 'admin@example.test', 'admin', ${avatar}, 'Admin', 'user_admin', 1, 0),
                    (2, 'proposer@example.test', 'proposer', ${avatar}, 'Proposer', 'user_proposer', 0, 0),
                    (3, 'second-admin@example.test', 'second_admin', ${avatar}, 'Second admin', 'user_second_admin', 1, 0),
                    (4, 'member@example.test', 'member', ${avatar}, 'Member', 'user_member', 0, 0),
                    (5, 'gone-admin@example.test', 'gone_admin', ${avatar}, 'Gone admin', 'user_gone_admin', 1, 1);
            `,
            encoding: 'utf8',
        })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const asProposer = { Authorization: `Bearer ${sessionFor('user_proposer')}` }
    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }

    async function propose(title: string, addTo?: 'shelf' | 'wishlist'): Promise<number> {
        const response = await request(app.getHttpServer())
            .post('/profile/users/2/proposals')
            .set(asProposer)
            .send({ title, minPlayers: 2, maxPlayers: 4, gameAvgDuration: 30, ...(addTo ? { addTo } : {}) })
            .expect(201)

        expect(response.body).toEqual(expect.objectContaining({ title, status: 'pending', addTo: addTo ?? null }))
        return Number(response.body.id)
    }

    async function notificationsFor(type: string, proposalId: number) {
        const result = await database.execute({
            sql: "SELECT accountId, data FROM Notification WHERE type = ? AND json_extract(data, '$.proposalId') = ? ORDER BY accountId",
            args: [type, proposalId],
        })

        return result.rows.map(row => ({ accountId: Number(row.accountId), data: JSON.parse(String(row.data)) as Record<string, unknown> }))
    }

    it('trims the title and refuses one of only spaces', async () => {
        const send = (title: string) =>
            request(app.getHttpServer())
                .post('/profile/users/2/proposals')
                .set(asProposer)
                .send({ title, minPlayers: 2, maxPlayers: 4, gameAvgDuration: 30 })

        await send('   ').expect(400)
        expect((await send('  Hive  ').expect(201)).body.title).toBe('Hive')
    })

    it('tells every active admin once, then puts the approved game on the proposer’s shelf', async () => {
        const proposalId = await propose('Azul', 'shelf')

        expect((await notificationsFor('game_proposal_submitted', proposalId)).map(entry => entry.accountId)).toEqual([1, 3])

        const approved = await request(app.getHttpServer()).post(`/admin/proposals/${proposalId}/approve`).set(asAdmin).send({})

        expect(approved.status).toBeLessThan(300)
        const createdGameId = Number(approved.body.createdGameId)
        const shelf = await database.execute({ sql: 'SELECT 1 FROM OwnedGame WHERE accountId = 2 AND gameId = ?', args: [createdGameId] })
        const [approval] = await notificationsFor('game_proposal_approved', proposalId)

        expect(shelf.rows).toHaveLength(1)
        expect(approval).toEqual({ accountId: 2, data: expect.objectContaining({ createdGameId }) })
    })

    it('puts an approved game on the wishlist when asked, and adds nothing when not asked', async () => {
        const wishlistProposal = await propose('Cascadia', 'wishlist')
        const plainProposal = await propose('Patchwork')

        const wishlisted = await request(app.getHttpServer()).post(`/admin/proposals/${wishlistProposal}/approve`).set(asAdmin).send({})
        const plain = await request(app.getHttpServer()).post(`/admin/proposals/${plainProposal}/approve`).set(asAdmin).send({})

        const wishlist = await database.execute({
            sql: 'SELECT 1 FROM WishlistedGame WHERE accountId = 2 AND gameId = ?',
            args: [Number(wishlisted.body.createdGameId)],
        })
        const untouched = await database.execute({
            sql: 'SELECT (SELECT COUNT(*) FROM OwnedGame WHERE gameId = ?) + (SELECT COUNT(*) FROM WishlistedGame WHERE gameId = ?)',
            args: [Number(plain.body.createdGameId), Number(plain.body.createdGameId)],
        })

        expect(wishlist.rows).toHaveLength(1)
        expect(Number(untouched.rows[0]?.[0])).toBe(0)
    })

    it('adds nothing for a rejected or duplicate proposal', async () => {
        const rejected = await propose('Rejected game', 'shelf')
        const duplicate = await propose('Duplicate game', 'wishlist')
        const before = await database.execute('SELECT (SELECT COUNT(*) FROM OwnedGame) + (SELECT COUNT(*) FROM WishlistedGame)')

        await request(app.getHttpServer())
            .post(`/admin/proposals/${rejected}/reject`)
            .set(asAdmin)
            .send({ reviewNotes: 'Not a board game' })
        const existing = await database.execute(
            "INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES ('', 30, 2, 4) RETURNING id",
        )

        await request(app.getHttpServer())
            .post(`/admin/proposals/${duplicate}/duplicate`)
            .set(asAdmin)
            .send({ duplicateOfGameId: Number(existing.rows[0]?.id), reviewNotes: 'Already listed' })
            .expect(201)

        const after = await database.execute('SELECT (SELECT COUNT(*) FROM OwnedGame) + (SELECT COUNT(*) FROM WishlistedGame)')
        const statuses = await database.execute({
            sql: 'SELECT status FROM GameProposal WHERE id IN (?, ?) ORDER BY id',
            args: [rejected, duplicate],
        })

        expect(statuses.rows.map(row => row.status)).toEqual(['rejected', 'duplicate'])
        expect(Number(after.rows[0]?.[0])).toBe(Number(before.rows[0]?.[0]))
    })

    describe('reviewing a proposal', () => {
        async function proposeBare(title: string, extra: Record<string, unknown> = {}): Promise<number> {
            const response = await request(app.getHttpServer())
                .post('/profile/users/2/proposals')
                .set(asProposer)
                .send({ title, ...extra })
                .expect(201)

            return Number(response.body.id)
        }

        async function createTag(name: string): Promise<number> {
            const category = await database.execute({
                sql: 'INSERT INTO TagCategory (name) VALUES (?) RETURNING id',
                args: [`${name} category`],
            })
            const tag = await database.execute({
                sql: 'INSERT INTO Tag (name, categoryId) VALUES (?, ?) RETURNING id',
                args: [name, Number(category.rows[0]?.id)],
            })

            return Number(tag.rows[0]?.id)
        }

        it('will not approve without players and length, and invents none', async () => {
            const proposalId = await proposeBare('Hanabi')

            const refused = await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/approve`)
                .set(asAdmin)
                .send({})
                .expect(400)

            expect(refused.body.message).toBe('The proposal has no gameAvgDuration, minPlayers, maxPlayers; set them to approve it.')
            const status = await database.execute({ sql: 'SELECT status FROM GameProposal WHERE id = ?', args: [proposalId] })

            expect(status.rows[0]?.status).toBe('pending')
        })

        it('creates the game with exactly the reviewed values, both titles and the chosen tags', async () => {
            const proposalId = await proposeBare('Codenames', { proposedTags: 'party' })
            const partyTag = await createTag('Party')

            const approved = await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/approve`)
                .set(asAdmin)
                .send({
                    minPlayers: 2,
                    maxPlayers: 8,
                    gameAvgDuration: 15,
                    imageUrl: 'https://example.test/codenames.png',
                    translations: { en: 'Codenames', es: 'Código Secreto' },
                    tagIds: [partyTag],
                })
                .expect(201)
            const gameId = Number(approved.body.createdGameId)

            const game = await database.execute({
                sql: 'SELECT imageUrl, gameAvgDuration, minPlayers, maxPlayers FROM Game WHERE id = ?',
                args: [gameId],
            })
            const titles = await database.execute({
                sql: 'SELECT languageCode, title FROM GameTranslation WHERE gameId = ? ORDER BY languageCode',
                args: [gameId],
            })
            const tags = await database.execute({ sql: 'SELECT tagId FROM GameTag WHERE gameId = ?', args: [gameId] })

            expect({ ...game.rows[0] }).toEqual({
                imageUrl: 'https://example.test/codenames.png',
                gameAvgDuration: 15,
                minPlayers: 2,
                maxPlayers: 8,
            })
            expect(titles.rows.map(row => [row.languageCode, row.title])).toEqual([
                ['en', 'Codenames'],
                ['es', 'Código Secreto'],
            ])
            expect(tags.rows.map(row => Number(row.tagId))).toEqual([partyTag])
        })

        it('refuses unknown tags and more minimum than maximum players', async () => {
            const proposalId = await proposeBare('Skull')
            const base = { minPlayers: 3, maxPlayers: 6, gameAvgDuration: 20 }

            await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/approve`)
                .set(asAdmin)
                .send({ ...base, tagIds: [999_999] })
                .expect(400)
            await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/approve`)
                .set(asAdmin)
                .send({ ...base, minPlayers: 7 })
                .expect(400)
        })

        it('tells the proposer the rejection reason the admin wrote', async () => {
            const proposalId = await proposeBare('Monopoly')

            await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/reject`)
                .set(asAdmin)
                .send({ reviewNotes: 'This is not a board game we track.' })
                .expect(201)

            const message = await database.execute({
                sql: "SELECT message FROM Notification WHERE type = 'game_proposal_rejected' AND json_extract(data, '$.proposalId') = ?",
                args: [proposalId],
            })

            expect(String(message.rows[0]?.message)).toContain('This is not a board game we track.')
        })

        it('points the proposer to the game a duplicate duplicates, and needs that game', async () => {
            const proposalId = await proposeBare('Los colonos de Catan')
            const catan = await database.execute(
                "INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES ('', 90, 3, 4) RETURNING id",
            )
            const catanId = Number(catan.rows[0]?.id)

            await database.execute({
                sql: "INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, 'en', 'Catan', 'catan')",
                args: [catanId],
            })

            await request(app.getHttpServer()).post(`/admin/proposals/${proposalId}/duplicate`).set(asAdmin).send({}).expect(400)
            await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/duplicate`)
                .set(asAdmin)
                .send({ duplicateOfGameId: 999_999 })
                .expect(404)
            await request(app.getHttpServer())
                .post(`/admin/proposals/${proposalId}/duplicate`)
                .set(asAdmin)
                .send({ duplicateOfGameId: catanId, reviewNotes: 'Listed under its English title.' })
                .expect(201)

            const [notification] = await notificationsFor('game_proposal_duplicate', proposalId)

            expect(notification).toEqual({
                accountId: 2,
                data: { gameTitle: 'Los colonos de Catan', proposalId, duplicateOfGameId: catanId, duplicateOfTitle: 'Catan' },
            })
        })

        it('counts proposals per status and lists the pending queue oldest first', async () => {
            const response = await request(app.getHttpServer())
                .get('/admin/proposals')
                .query({ status: 'pending', limit: 100 })
                .set(asAdmin)
                .expect(200)
            const submitted = response.body.proposals.map((proposal: { submittedAt: string; id: number }) => [
                proposal.submittedAt,
                proposal.id,
            ])

            expect(response.body.statusCounts).toEqual(
                expect.objectContaining({
                    pending: response.body.pagination.totalItems,
                    rejected: expect.any(Number),
                    duplicate: expect.any(Number),
                }),
            )
            expect(submitted).toEqual([...submitted].sort((a, b) => String(a[0]).localeCompare(String(b[0])) || a[1] - b[1]))
        })
    })
})
