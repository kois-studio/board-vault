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
const testDatabasePath = resolve(__dirname, 'group-collection-worth.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('group collection worth (e2e)', () => {
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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'ana@example.test', 'ana_ruiz', ${avatar}, 'Ana Ruiz', 'user_ana', 1, 0),
                    (2, 'bruno@example.test', 'bruno', ${avatar}, 'Bruno', 'user_bruno', 0, 0),
                    (3, 'gone@example.test', 'gone', ${avatar}, 'Gone', 'user_gone', 0, 1),
                    (4, 'outsider@example.test', 'outsider', ${avatar}, 'Outsider', 'user_outsider', 0, 0);
                -- Catan €44.95, Azul €39.99, Hanabi with no known price.
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers, retailPriceCents) VALUES
                    (1, '', 75, 3, 4, 4495), (2, '', 45, 2, 4, 3999), (3, '', 25, 2, 5, NULL);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Catan', 'catan'), (2, 'en', 'Azul', 'azul'), (3, 'en', 'Hanabi', 'hanabi');
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 10);
                -- Ana paid 5 euros for her second-hand Catan: that never shows.
                INSERT INTO OwnedGame (accountId, gameId, purchasePrice) VALUES (1, 1, 5), (1, 3, 12), (2, 1, NULL), (3, 2, 30), (4, 2, 30);
                -- Nora has no account; Bruno is also linked as a group person; Old Pablo is archived.
                INSERT INTO GroupPerson (id, groupId, accountId, kind, status, displayName, createdByAccountId) VALUES
                    (20, 10, NULL, 'placeholder', 'active', 'Nora', 1),
                    (21, 10, 2, 'linked', 'active', 'Bruno', 1),
                    (22, 10, NULL, 'placeholder', 'archived', 'Old Pablo', 1),
                    (23, 10, NULL, 'placeholder', 'active', 'Quim', 1);
                INSERT INTO GroupPersonGameOwnership (groupPersonId, gameId, status, enteredByAccountId) VALUES
                    (20, 2, 'asserted', 1), (20, 1, 'rejected', 1), (21, 2, 'asserted', 1), (22, 2, 'asserted', 1);
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

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    it("estimates everyone's collection from retail prices, never from what they paid", async () => {
        const response = await request(app.getHttpServer()).get('/groups/10/collection').set(as('user_bruno')).expect(200)
        const summary = response.body.people.map(
            (person: { displayName: string; worth: number; pricedGames: number; games: Array<{ title: string }> }) => [
                person.displayName,
                person.worth,
                person.pricedGames,
                person.games.map(game => game.title),
            ],
        )

        // Ana: Catan 44.95 (not the 5 she paid) and Hanabi without a price. Bruno: Catan.
        // Nora: Azul, but not her rejected Catan. Quim has no games. The deleted member and the
        // archived person are left out, and Bruno's linked group person does not count twice.
        expect(summary).toEqual([
            ['Ana Ruiz', 45, 1, ['Catan', 'Hanabi']],
            ['Bruno', 45, 1, ['Catan']],
            ['Nora', 40, 1, ['Azul']],
            ['Quim', 0, 0, []],
        ])
        expect(response.body.people[0]).toEqual(expect.objectContaining({ accountId: 1, groupPersonId: null }))
        expect(response.body.people[2]).toEqual(expect.objectContaining({ accountId: null, groupPersonId: 20 }))
        // 44.95 + 44.95 + 39.99, rounded once.
        expect(response.body).toEqual(expect.objectContaining({ worth: 130, copies: 4, pricedCopies: 3 }))
        expect(JSON.stringify(response.body)).not.toContain('purchasePrice')
    })

    it('answers group members only', async () => {
        await request(app.getHttpServer()).get('/groups/10/collection').set(as('user_outsider')).expect(403)
    })

    it('lets an admin set, change and clear a retail price, and lists games without one', async () => {
        const saved = await request(app.getHttpServer()).patch('/admin/games/3').set(as('user_ana')).send({ retailPrice: 14.5 }).expect(200)

        expect(saved.body).toEqual(expect.objectContaining({ retailPrice: 14.5 }))
        expect(saved.body.issues).not.toContain('no-price')

        const stored = await database.execute({ sql: 'SELECT retailPriceCents FROM Game WHERE id = 3', args: [] })

        expect(Number(stored.rows[0]?.retailPriceCents)).toBe(1450)

        for (const retailPrice of [-1, 9.999, 'cheap', 6000]) {
            await request(app.getHttpServer()).patch('/admin/games/3').set(as('user_ana')).send({ retailPrice }).expect(400)
        }

        const cleared = await request(app.getHttpServer())
            .patch('/admin/games/3')
            .set(as('user_ana'))
            .send({ retailPrice: null })
            .expect(200)
        const unpriced = await request(app.getHttpServer()).get('/admin/games').query({ issue: 'no-price' }).set(as('user_ana')).expect(200)

        expect(cleared.body).toEqual(expect.objectContaining({ retailPrice: null, issues: expect.arrayContaining(['no-price']) }))
        expect(unpriced.body.games.map((game: { title: string }) => game.title)).toEqual(['Hanabi'])
    })
})
