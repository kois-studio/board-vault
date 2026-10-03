import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './../src/app.module'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier'
import { removeTestDatabase } from './remove-test-database'

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
            .send({ title, minPlayers: 2, maxPlayers: 4, ...(addTo ? { addTo } : {}) })
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
        await request(app.getHttpServer())
            .post(`/admin/proposals/${duplicate}/duplicate`)
            .set(asAdmin)
            .query({ reviewNotes: 'Already listed' })

        const after = await database.execute('SELECT (SELECT COUNT(*) FROM OwnedGame) + (SELECT COUNT(*) FROM WishlistedGame)')
        const statuses = await database.execute({
            sql: 'SELECT status FROM GameProposal WHERE id IN (?, ?) ORDER BY id',
            args: [rejected, duplicate],
        })

        expect(statuses.rows.map(row => row.status)).toEqual(['rejected', 'duplicate'])
        expect(Number(after.rows[0]?.[0])).toBe(Number(before.rows[0]?.[0]))
    })
})
