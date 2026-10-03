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
const testDatabasePath = resolve(__dirname, 'group-insights.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

/**
 * Hand-checked fixture:
 * - night 1 (completed, accounts): Alpha played by Organizer and Member, Bravo by Member; Member won both.
 * - night 2 (completed, group people): Alpha played by Organizer's linked person and Guest; they shared the win.
 * - night 3 (scheduled) and night 4 (cancelled) mark Charlie as played and must be ignored.
 * - The shelf holds Alpha (Organizer), Bravo and Charlie (Member), and Delta (Guest, a person without an account).
 */
describe('group insights (e2e)', () => {
    let app: INestApplication
    let database: Client
    let groupId: number
    let organizerPersonId: number
    let guestPersonId: number

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
                PRAGMA foreign_keys = ON;
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId)
                VALUES
                    (1, 'organizer@example.test', 'organizer', ${avatar}, 'Organizer', 'user_organizer'),
                    (2, 'member@example.test', 'member', ${avatar}, 'Member Account', 'user_member'),
                    (3, 'outsider@example.test', 'outsider', ${avatar}, 'Outsider', 'user_outsider');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
                VALUES
                    (10, 'https://example.test/10.png', 60, 2, 4),
                    (11, 'https://example.test/11.png', 30, 2, 5),
                    (12, 'https://example.test/12.png', 45, 2, 6),
                    (13, 'https://example.test/13.png', 20, 3, 8);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle)
                VALUES (10, 'en', 'Alpha', 'alpha'), (11, 'en', 'Bravo', 'bravo'), (12, 'en', 'Charlie', 'charlie'), (13, 'es', 'Delta', 'delta');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 10), (2, 11), (2, 12), (3, 13);
            `,
            encoding: 'utf8',
        })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })

        const created = await request(app.getHttpServer())
            .post('/dashboard/users/1/groups/create/insights_group')
            .set({ Authorization: `Bearer ${sessionFor('user_organizer')}` })
            .send({})
            .expect(201)

        groupId = Number(created.body.groupId)

        await database.batch([
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (2, ?)', args: [groupId] },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, 2, 'linked', 'active', 'Member', 1)",
                args: [groupId],
            },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, NULL, 'placeholder', 'active', 'Guest', 1)",
                args: [groupId],
            },
        ])
        const people = await database.execute({
            sql: 'SELECT id, accountId, displayName FROM GroupPerson WHERE groupId = ?',
            args: [groupId],
        })

        organizerPersonId = Number(people.rows.find(row => Number(row.accountId) === 1)?.id)
        guestPersonId = Number(people.rows.find(row => row.displayName === 'Guest')?.id)

        await database.batch([
            {
                sql: "INSERT INTO GroupPersonGameOwnership (groupPersonId, gameId, status, enteredByAccountId) VALUES (?, 13, 'asserted', 1)",
                args: [guestPersonId],
            },
            {
                sql: `INSERT INTO Meet (id, groupId, createdBy, meetDate, status) VALUES
                    (100, ?, 1, '2026-09-01T18:00:00.000Z', 'completed'),
                    (101, ?, 1, '2026-09-08T18:00:00.000Z', 'completed'),
                    (102, ?, 1, '2026-10-20T18:00:00.000Z', 'scheduled'),
                    (103, ?, 1, '2026-09-15T18:00:00.000Z', 'cancelled')`,
                args: [groupId, groupId, groupId, groupId],
            },
            "INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (100, 10, 'played'), (100, 11, 'played'), (101, 10, 'played'), (101, 11, 'skipped'), (102, 12, 'played'), (103, 12, 'played')",
            'INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (100, 1, 10), (100, 2, 10), (100, 2, 11), (102, 1, 12), (103, 1, 12)',
            {
                sql: 'INSERT INTO MeetPersonGame (meetId, groupPersonId, gameId) VALUES (101, ?, 10), (101, ?, 10)',
                args: [organizerPersonId, guestPersonId],
            },
            `INSERT INTO MeetGameResult (meetId, gameId, accountId, groupPersonId, isWinner) VALUES
                (100, 10, 2, NULL, 1), (100, 11, 2, NULL, 1), (100, 10, 1, NULL, 0), (102, 12, 1, NULL, 1)`,
            {
                sql: 'INSERT INTO MeetGameResult (meetId, gameId, accountId, groupPersonId, isWinner) VALUES (101, 10, NULL, ?, 1), (101, 10, NULL, ?, 1)',
                args: [organizerPersonId, guestPersonId],
            },
        ])
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    it('counts wins, games and nights per person from completed nights only', async () => {
        const response = await request(app.getHttpServer())
            .get(`/groups/${groupId}/insights`)
            .set({ Authorization: `Bearer ${sessionFor('user_member')}` })
            .expect(200)

        expect({
            sessions: response.body.sessions,
            gamesPlayed: response.body.gamesPlayed,
            gamesWithWinner: response.body.gamesWithWinner,
        }).toEqual({
            sessions: 2,
            gamesPlayed: 3,
            gamesWithWinner: 3,
        })
        expect(
            response.body.standings.map((entry: Record<string, unknown>) => [
                entry.displayName,
                entry.wins,
                entry.gamesPlayed,
                entry.sessions,
            ]),
        ).toEqual([
            ['Member', 2, 2, 1],
            ['Organizer', 1, 2, 2],
            ['Guest', 1, 1, 1],
        ])
        expect(response.body.standings[1]).toEqual(expect.objectContaining({ accountId: 1, groupPersonId: organizerPersonId }))
        expect(response.body.standings[2]).toEqual(expect.objectContaining({ accountId: null, groupPersonId: guestPersonId, avatar: null }))
    })

    it('lists the most played games and the owned games never played', async () => {
        const response = await request(app.getHttpServer())
            .get(`/groups/${groupId}/insights`)
            .set({ Authorization: `Bearer ${sessionFor('user_organizer')}` })
            .expect(200)

        expect(
            response.body.mostPlayed.map((entry: { gameData: { title: string }; sessions: number }) => [
                entry.gameData.title,
                entry.sessions,
            ]),
        ).toEqual([
            ['Alpha', 2],
            ['Bravo', 1],
        ])
        expect(response.body.mostPlayed[0].lastPlayedAt).toBe('2026-09-08T18:00:00.000Z')
        // Charlie was only "played" in a scheduled and a cancelled night; Delta is on the Guest's shelf.
        expect(response.body.neverPlayed.map((game: { titleTranslations: { en: string } }) => game.titleTranslations.en)).toEqual([
            'Charlie',
            'Delta',
        ])
        expect(response.body.neverPlayedCount).toBe(2)
    })

    it('is only readable by group members', async () => {
        const response = await request(app.getHttpServer())
            .get(`/groups/${groupId}/insights`)
            .set({ Authorization: `Bearer ${sessionFor('user_outsider')}` })

        expect(response.status).toBeGreaterThanOrEqual(403)
        expect(response.status).toBeLessThan(405)
    })
})
