import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { AccountDeletionService } from './../src/modules/common/auth/account-deletion.service.js'
import { ClerkIdentityService } from './../src/modules/common/auth/clerk-identity.service.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'account-deletion.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

type HistoryPerson = { id: number; displayName: string; accountId: number | null; standing: string }

/**
 * ADR-0018: Carlos, Mario and Jose played Catan and Carcassonne one Friday.
 * Jose leaves the group, then Mario deletes his account. The night still has
 * three players: Carlos, Jose (left) and a "Deleted account".
 */
describe('leaving a group and deleting an account (e2e)', () => {
    let app: INestApplication
    let database: Client
    let deleteClerkUser: ReturnType<typeof vi.fn<(clerkUserId: string) => Promise<void>>>
    let groupId: number
    let soloGroupId: number
    let fridayId: number
    let upcomingId: number
    const personOf: Record<'carlos' | 'mario' | 'jose', number> = { carlos: 0, mario: 0, jose: 0 }

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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId)
                VALUES
                    (1, 'carlos@example.test', 'carlos', ${avatar}, 'Carlos', 'user_carlos'),
                    (2, 'mario@example.test', 'mario', ${avatar}, 'Mario', 'user_mario'),
                    (3, 'jose@example.test', 'jose', ${avatar}, 'Jose', 'user_jose');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
                VALUES (10, '', 60, 2, 4), (11, '', 45, 2, 5);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle)
                VALUES (10, 'en', 'Catan', 'catan'), (11, 'en', 'Carcassonne', 'carcassonne');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 10), (1, 11);
                INSERT INTO WishlistedGame (accountId, gameId) VALUES (2, 11);
                INSERT INTO GameReview (accountId, gameId, review) VALUES (2, 10, 9);
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
        deleteClerkUser = vi.fn<(clerkUserId: string) => Promise<void>>().mockResolvedValue(undefined)
        app.get(ClerkIdentityService).deleteClerkUser = deleteClerkUser
        database = createClient({ url: `file:${testDatabasePath}` })

        // Mario created the group; Carlos joined before Jose, so Carlos takes it over.
        const created = await request(app.getHttpServer())
            .post('/dashboard/users/2/groups/create/friday_club')
            .set(auth('user_mario'))
            .expect(201)

        groupId = Number(created.body.groupId)
        await database.batch([
            {
                sql: "INSERT INTO GroupMembership (accountId, groupId, joinedAt) VALUES (1, ?, '2026-01-01'), (3, ?, '2026-02-01')",
                args: [groupId, groupId],
            },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, 1, 'linked', 'active', 'Carlos', 2), (?, 3, 'linked', 'active', 'Jose', 2)",
                args: [groupId, groupId],
            },
        ])
        const people = await database.execute({ sql: 'SELECT id, accountId FROM GroupPerson WHERE groupId = ?', args: [groupId] })

        for (const row of people.rows) {
            const key = ({ 1: 'carlos', 2: 'mario', 3: 'jose' } as const)[Number(row.accountId) as 1 | 2 | 3]

            personOf[key] = Number(row.id)
        }
        const everyone = [personOf.carlos, personOf.mario, personOf.jose]

        const friday = await request(app.getHttpServer())
            .post('/sessions')
            .set(auth('user_mario'))
            .send({
                groupId,
                sessionDate: '2026-10-02T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: everyone,
                games: [
                    { gameId: 10, participantPersonIds: everyone },
                    { gameId: 11, participantPersonIds: everyone },
                ],
            })
            .expect(201)

        fridayId = Number(friday.body.sessionId)
        await database.execute({
            sql: 'INSERT INTO MeetGameResult (meetId, gameId, groupPersonId, isWinner, score) VALUES (?, 10, ?, 1, 10)',
            args: [fridayId, personOf.mario],
        })

        const upcoming = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(auth('user_mario'))
            .send({
                groupId,
                sessionDate: '2026-12-20T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: everyone,
                plannedGameIds: [10],
            })
            .expect(201)

        upcomingId = Number(upcoming.body.sessionId)

        // A group only Mario is in, with a night of its own.
        const solo = await request(app.getHttpServer()).post('/dashboard/users/2/groups/create/just_me').set(auth('user_mario')).expect(201)

        soloGroupId = Number(solo.body.groupId)
        const soloPerson = await database.execute({ sql: 'SELECT id FROM GroupPerson WHERE groupId = ?', args: [soloGroupId] })

        await request(app.getHttpServer())
            .post('/sessions')
            .set(auth('user_mario'))
            .send({
                groupId: soloGroupId,
                sessionDate: '2026-10-03T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: [Number(soloPerson.rows[0]?.id)],
                games: [{ gameId: 10, participantPersonIds: [Number(soloPerson.rows[0]?.id)] }],
            })
            .expect(201)
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    async function fridayAsCarlos() {
        const history = await request(app.getHttpServer())
            .get(`/dashboard/users/1/groups/${groupId}/meetings`)
            .set(auth('user_carlos'))
            .expect(200)
        const night = (history.body as Array<{ meetData: { id: number } }>).find(record => record.meetData.id === fridayId) as unknown as {
            attendedByPeople: Array<HistoryPerson>
            gamesPlayed: Array<{ gameData: { id: number }; playedByPeople: Array<HistoryPerson>; winnerPersonIds: Array<number> }>
        }
        const byPerson = (people: Array<HistoryPerson>) =>
            Object.fromEntries(people.map(person => [person.id, { name: person.displayName, standing: person.standing }]))

        return { night, byPerson }
    }

    async function upcomingPeople(): Promise<Array<number>> {
        const rows = await database.execute({ sql: 'SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ?', args: [upcomingId] })

        return rows.rows.map(row => Number(row.groupPersonId)).sort((a, b) => a - b)
    }

    it('keeps Jose in the night after he leaves, marked as left, and drops him from the upcoming one', async () => {
        await request(app.getHttpServer()).delete(`/dashboard/users/3/groups/${groupId}/members`).set(auth('user_jose')).expect(200)

        const { night, byPerson } = await fridayAsCarlos()

        expect(night.attendedByPeople).toHaveLength(3)
        expect(byPerson(night.attendedByPeople)[personOf.jose]).toEqual({ name: 'Jose', standing: 'left' })
        expect(byPerson(night.attendedByPeople)[personOf.carlos]).toEqual({ name: 'Carlos', standing: 'member' })
        expect(await upcomingPeople()).toEqual([personOf.carlos, personOf.mario].sort((a, b) => a - b))

        // Someone who left cannot be put in a new session.
        await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(auth('user_carlos'))
            .send({
                groupId,
                sessionDate: '2026-12-27T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: [personOf.carlos, personOf.jose],
            })
            .expect(400)
    })

    it('deletes Mario: three players remain, one of them a "Deleted account" who still won Catan', async () => {
        await request(app.getHttpServer()).delete('/auth/account').set(auth('user_mario')).expect(204)

        expect(deleteClerkUser).toHaveBeenCalledWith('user_mario')

        const { night, byPerson } = await fridayAsCarlos()
        const catan = night.gamesPlayed.find(game => game.gameData.id === 10)

        expect(night.attendedByPeople).toHaveLength(3)
        expect(byPerson(night.attendedByPeople)).toEqual({
            [personOf.carlos]: { name: 'Carlos', standing: 'member' },
            [personOf.mario]: { name: 'Deleted account', standing: 'deleted' },
            [personOf.jose]: { name: 'Jose', standing: 'left' },
        })
        expect(night.gamesPlayed.map(game => game.playedByPeople.length)).toEqual([3, 3])
        expect(catan?.winnerPersonIds).toEqual([personOf.mario])
    })

    it('passes the group and the upcoming night to Carlos, and deletes the group nobody else was in', async () => {
        const group = await database.execute({ sql: 'SELECT createdBy FROM UserGroup WHERE id = ?', args: [groupId] })
        const upcoming = await database.execute({ sql: 'SELECT createdBy FROM Meet WHERE id = ?', args: [upcomingId] })
        const solo = await database.execute({ sql: 'SELECT id FROM UserGroup WHERE id = ?', args: [soloGroupId] })

        expect(Number(group.rows[0]?.createdBy)).toBe(1)
        expect(Number(upcoming.rows[0]?.createdBy)).toBe(1)
        expect(await upcomingPeople()).toEqual([personOf.carlos])
        expect(solo.rows).toHaveLength(0)
    })

    it('keeps nothing personal on the account and removes its private data', async () => {
        const account = await database.execute('SELECT email, username, displayName, isDeleted FROM Account WHERE id = 2')
        const leftovers = await database.execute(`
            SELECT
                (SELECT COUNT(*) FROM OwnedGame WHERE accountId = 2) +
                (SELECT COUNT(*) FROM WishlistedGame WHERE accountId = 2) +
                (SELECT COUNT(*) FROM GameReview WHERE accountId = 2) +
                (SELECT COUNT(*) FROM GroupMembership WHERE accountId = 2) AS total
        `)

        expect(account.rows[0]).toMatchObject({
            email: 'deleted-2@deleted.invalid',
            username: 'deleted-2',
            displayName: 'Deleted account',
            isDeleted: 1,
        })
        expect(Number(leftovers.rows[0]?.total)).toBe(0)

        // Carlos keeps his own collection.
        const carlosGames = await database.execute('SELECT gameId FROM OwnedGame WHERE accountId = 1')

        expect(carlosGames.rows.map(row => Number(row.gameId))).toEqual([11])
    })

    it('refuses the deleted account, and a repeated deletion from Clerk changes nothing', async () => {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_mario')).expect(401)

        await app.get(AccountDeletionService).deleteAccountForClerkUser('user_mario')

        const { night } = await fridayAsCarlos()

        expect(night.attendedByPeople).toHaveLength(3)
    })
})
