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
const testDatabasePath = resolve(__dirname, 'group-activity-notifications.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const NAMES: Record<number, string> = { 2: 'olga', 3: 'pau', 4: 'rita', 5: 'tess', 6: 'uma', 7: 'vera' }
const GAMES: Record<number, string> = { 101: 'Catan', 102: 'Azul', 103: 'Root', 104: 'Wingspan', 105: 'Carcassonne' }

type Notification = {
    id: number
    type: string
    message: string
    data: Record<string, unknown>
    createdAt: string
    isRead: boolean
    context?: Record<string, unknown>
}

/**
 * What a group hears when someone's shelf changes or someone joins or leaves, through the API on a
 * real database: one notification per person whose shelf changed, kept up to date while unread, so
 * adding and removing games over and over never fills an inbox.
 *
 * Fridays (10, Olga's): Olga, Paula, Rita, Tess. Sundays (20, Olga's): Olga, Paula. Uma shares no group.
 */
describe('group activity notifications (e2e)', () => {
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
        const games = Object.entries(GAMES)

        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (2, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                    (3, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                    (4, 'rita@example.test', 'ritaplays', ${avatar}, 'Rita', 'user_rita', 0, 0),
                    (5, 'tess@example.test', 'tessplays', ${avatar}, 'Tess', 'user_tess', 0, 0),
                    (6, 'uma@example.test', 'umaplays', ${avatar}, 'Uma', 'user_uma', 0, 0),
                    (7, 'vera@example.test', 'veraplays', ${avatar}, 'Vera', 'user_vera', 0, 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 2), (20, 'Sundays', 2);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (2, 10), (3, 10), (4, 10), (5, 10), (2, 20), (3, 20);
                INSERT INTO Game (id, imageUrl) VALUES ${games.map(([id]) => `(${id}, '')`).join(', ')};
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    ${games.map(([id, title]) => `(${id}, 'en', '${title}', '${title.toLowerCase()}')`).join(', ')};
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

    const server = () => request(app.getHttpServer())
    const as = (id: number) => ({ Authorization: `Bearer ${sessionFor(`user_${NAMES[id]}`)}` })
    const inbox = async (id: number) =>
        (await server().get(`/profile/users/${id}/notifications`).set(as(id)).expect(200)).body as Array<Notification>
    const ofType = async (id: number, type: string) => (await inbox(id)).filter(notification => notification.type === type)
    const shelf = (id: number) => ofType(id, 'shelf_changed')
    const add = (accountId: number, gameId: number) =>
        server().post(`/collection/users/${accountId}/games/${gameId}`).set(as(accountId)).expect(201)
    const remove = (accountId: number, gameId: number) =>
        server().delete(`/collection/users/${accountId}/games/${gameId}`).set(as(accountId)).expect(200)
    const read = (accountId: number, notificationId: number) =>
        server().put(`/notifications/${notificationId}`).set(as(accountId)).send({ isRead: true }).expect(200)
    const clearInboxes = () => database.execute('DELETE FROM Notification')

    describe('a shelf changing', () => {
        afterEach(async () => {
            await clearInboxes()
            await database.execute('DELETE FROM OwnedGame')
        })

        it('tells each person who shares a group, once even when they share two, and nobody else', async () => {
            await add(3, 101)

            for (const reader of [2, 4, 5]) {
                const notifications = await shelf(reader)

                expect(notifications).toHaveLength(1)
                expect(notifications[0]).toMatchObject({
                    message: 'Paula added Catan to their shelf.',
                    data: { account: 3, group: 10, added: [101], removed: [] },
                    isRead: false,
                })
            }
            expect(await shelf(3)).toEqual([])
            expect(await shelf(6)).toEqual([])
        })

        it('keeps one unread notification however often games go on and off, and says the net result', async () => {
            await add(3, 101)
            const [first] = await shelf(2)

            for (let round = 0; round < 15; round++) {
                await add(3, 102)
                await remove(3, 102)
            }
            await add(3, 103)

            const notifications = await shelf(2)

            expect(notifications).toHaveLength(1)
            // The same notification, said again with what changed since it was written.
            expect(notifications[0]?.id).toBe(first?.id)
            expect(notifications[0]).toMatchObject({
                message: 'Paula added Root and Catan to their shelf.',
                data: { account: 3, group: 10, added: [103, 101], removed: [] },
            })
            const stored = await database.execute("SELECT COUNT(*) AS n FROM Notification WHERE type = 'shelf_changed'")

            // One per reader: Olga, Rita and Tess.
            expect(Number(stored.rows[0]?.n)).toBe(3)
        })

        it('removes the unread notification when the changes undo each other', async () => {
            await add(3, 101)
            await add(3, 102)
            expect(await shelf(2)).toHaveLength(1)

            await remove(3, 101)
            expect((await shelf(2))[0]?.message).toBe('Paula added Azul to their shelf.')

            await remove(3, 102)
            expect(await shelf(2)).toEqual([])
            expect(await shelf(4)).toEqual([])
        })

        it('says what was removed, and both in one sentence', async () => {
            await database.execute('INSERT INTO OwnedGame (accountId, gameId) VALUES (3, 104), (3, 105)')

            await remove(3, 104)
            expect((await shelf(2))[0]?.message).toBe('Paula removed Wingspan from their shelf.')

            await add(3, 101)
            await remove(3, 105)
            expect((await shelf(2))[0]).toMatchObject({
                message: 'Paula added Catan to their shelf and removed Carcassonne and Wingspan.',
                data: { added: [101], removed: [105, 104] },
            })
        })

        it('comes with what the app needs to word it in any language (ADR-0024)', async () => {
            await add(3, 101)
            await database.execute(
                "INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (101, 'es', 'Catán', 'catan')",
            )

            const english = (await shelf(2))[0]

            expect(english?.context).toEqual({
                accounts: [{ id: 3, name: 'Paula', deleted: false }],
                groups: [{ id: 10, name: 'Fridays' }],
                sessions: [],
                people: [],
                games: [{ id: 101, title: 'Catan', titleLanguage: 'en' }],
            })

            const inSpanish = (await server().get('/profile/users/2/notifications').set(as(2)).set('Accept-Language', 'es').expect(200))
                .body as Array<Notification>

            expect(inSpanish.find(notification => notification.type === 'shelf_changed')?.context?.games).toEqual([
                { id: 101, title: 'Catán', titleLanguage: 'es' },
            ])
            await database.execute("DELETE FROM GameTranslation WHERE gameId = 101 AND languageCode = 'es'")
        })

        it('reads a deleted account as one, without its name', async () => {
            await add(3, 101)
            await database.execute('UPDATE Account SET isDeleted = 1 WHERE id = 3')

            expect((await shelf(2))[0]?.context?.accounts).toEqual([{ id: 3, name: null, deleted: true }])
            await database.execute('UPDATE Account SET isDeleted = 0 WHERE id = 3')
        })

        it('moves the updated notification to the top of the inbox', async () => {
            await add(3, 101)
            await database.execute("UPDATE Notification SET createdAt = '2026-01-01 10:00:00' WHERE type = 'shelf_changed'")
            await database.execute(
                `INSERT INTO Notification (accountId, type, message, data, createdAt) VALUES (2, 'user_joined_group', 'Someone joined Fridays.', '{"account":6,"group":10}', '2026-06-01 10:00:00')`,
            )
            expect((await inbox(2))[0]?.type).toBe('user_joined_group')

            await add(3, 102)

            const [top] = await inbox(2)

            expect(top?.type).toBe('shelf_changed')
            expect(Date.parse(top?.createdAt ?? '')).toBeGreaterThan(Date.parse('2026-06-01T10:00:00.000Z'))
        })

        it('starts a new notification once the reader has read the last one, and leaves that one as it was', async () => {
            await add(3, 101)
            const [first] = await shelf(2)

            await read(2, Number(first?.id))
            await remove(3, 101)

            const notifications = await shelf(2)

            expect(notifications).toHaveLength(2)
            expect(notifications.find(notification => notification.id === first?.id)).toMatchObject({
                isRead: true,
                message: 'Paula added Catan to their shelf.',
            })
            expect(notifications.find(notification => !notification.isRead)?.message).toBe('Paula removed Catan from their shelf.')
            // Rita had not read hers: for her, Catan came and went.
            expect(await shelf(4)).toEqual([])
        })

        it('writes one notification per reader when changes arrive at the same time', async () => {
            await Promise.all([101, 102, 103, 104, 105].map(gameId => add(3, gameId)))

            const notifications = await shelf(2)

            expect(notifications).toHaveLength(1)
            expect([...(notifications[0]?.data['added'] as Array<number>)].sort()).toEqual([101, 102, 103, 104, 105])
            expect(notifications[0]?.message).toMatch(/^Paula added .+, .+ and 3 other games to their shelf\.$/)
        })

        it('counts only what really changed in a change of many games at once', async () => {
            await database.execute('INSERT INTO OwnedGame (accountId, gameId) VALUES (3, 101)')

            await server()
                .put('/users/3/games')
                .set(as(3))
                .send({ gamesToAdd: [101, 102, 103], gamesToRemove: [101, 104] })
                .expect(200)

            // 101 was removed and added back, 104 was never there: only Azul and Root are new.
            expect((await shelf(2))[0]).toMatchObject({ data: { added: expect.arrayContaining([102, 103]), removed: [] } })
            expect(((await shelf(2))[0]?.data['added'] as Array<number>).length).toBe(2)
        })

        it('folds two unread notifications written before this rule into one, keeping what both said', async () => {
            const older = `INSERT INTO Notification (accountId, type, message, data) VALUES (2, 'shelf_changed', 'old', ?)`

            await database.execute({ sql: older, args: ['{"account":3,"group":10,"added":[104],"removed":[]}'] })
            await database.execute({ sql: older, args: ['{"account":3,"group":10,"added":[105],"removed":[]}'] })

            await add(3, 101)

            expect(await shelf(2)).toEqual([
                expect.objectContaining({
                    message: 'Paula added Catan, Carcassonne and Wingspan to their shelf.',
                    data: { account: 3, group: 10, added: [101, 105, 104], removed: [] },
                }),
            ])
        })

        it('tells nobody about a change that did not happen', async () => {
            await add(3, 101)
            await clearInboxes()

            await server().post('/collection/users/3/games/101').set(as(3)).expect(409)
            await server().delete('/collection/users/3/games/102').set(as(3)).expect(404)

            expect(await shelf(2)).toEqual([])
        })

        it('never lets anyone change, or announce, someone else’s shelf', async () => {
            await server().post('/collection/users/3/games/101').set(as(6)).expect(403)

            expect(await shelf(2)).toEqual([])
        })
    })

    describe('someone joining or leaving', () => {
        afterEach(clearInboxes)

        const invite = async (groupId: number, from: number, to: number) => {
            await server()
                .post('/invitations/byUsername')
                .set(as(from))
                .send({ groupId, username: `${NAMES[to]}plays` })
                .expect(201)
            const invitations = (await server().get(`/profile/users/${to}/invitations`).set(as(to)).expect(200)).body as Array<{
                id: number
                groupId: number
            }>
            const invitation = invitations.find(candidate => candidate.groupId === groupId)

            await server().post(`/profile/users/${to}/invitations/${invitation?.id}/accept`).set(as(to)).expect(201)
        }
        const leave = (accountId: number, groupId: number) =>
            server().delete(`/dashboard/users/${accountId}/groups/${groupId}/members`).set(as(accountId)).expect(200)

        it('tells the members still in the group when someone leaves, and nobody else', async () => {
            await invite(10, 2, 7)
            for (const reader of [2, 3, 4, 5]) for (const joined of await ofType(reader, 'user_joined_group')) await read(reader, joined.id)

            await leave(7, 10)

            for (const reader of [2, 3, 4, 5]) {
                expect(await ofType(reader, 'user_left_group')).toEqual([
                    expect.objectContaining({ message: 'Vera left Fridays.', data: { account: 7, group: 10, member: 7 }, isRead: false }),
                ])
            }
            expect(await ofType(7, 'user_left_group')).toEqual([])
            expect(await ofType(6, 'user_left_group')).toEqual([])
        })

        it('says nothing when someone leaves before the group read that they joined', async () => {
            await invite(10, 2, 7)
            expect(await ofType(3, 'user_joined_group')).toHaveLength(1)

            await leave(7, 10)

            expect(await ofType(3, 'user_joined_group')).toEqual([])
            expect(await ofType(3, 'user_left_group')).toEqual([])
        })

        it('says nothing when someone comes back before the group read that they left', async () => {
            await invite(10, 2, 7)
            await read(3, Number((await ofType(3, 'user_joined_group'))[0]?.id))
            await leave(7, 10)
            expect(await ofType(3, 'user_left_group')).toHaveLength(1)

            await invite(10, 2, 7)

            expect(await ofType(3, 'user_left_group')).toEqual([])
            // Paula read that Vera joined the first time: that one stays, and nothing new arrives.
            expect(await ofType(3, 'user_joined_group')).toEqual([expect.objectContaining({ isRead: true })])
            await leave(7, 10)
        })

        it('says who removed whom, and does not tell the owner who did it', async () => {
            await invite(10, 2, 7)
            await clearInboxes()

            await server().delete('/dashboard/users/2/groups/10/members/7').set(as(2)).expect(200)

            expect((await ofType(3, 'user_left_group'))[0]).toMatchObject({
                message: 'Olga removed Vera from Fridays.',
                data: { account: 2, group: 10, member: 7 },
            })
            expect(await ofType(2, 'user_left_group')).toEqual([])
            expect(await ofType(7, 'user_left_group')).toEqual([])
        })

        it('says nothing when a request leaves a group the person was not in', async () => {
            await server().delete('/dashboard/users/2/groups/10/members/6').set(as(2)).expect(200)

            expect(await ofType(3, 'user_left_group')).toEqual([])
        })

        it('drops what others were told about the shelf of someone who leaves, and what the leaver was told', async () => {
            await invite(10, 2, 7)
            await clearInboxes()
            await add(7, 101)
            await add(3, 102)
            expect(await shelf(2)).toHaveLength(2)
            expect(await shelf(7)).toHaveLength(1)

            await leave(7, 10)

            // Olga keeps what she was told about Paula, not about Vera; Vera keeps nothing about Fridays.
            expect((await shelf(2)).map(notification => notification.data['account'])).toEqual([3])
            expect(await shelf(7)).toEqual([])
            await database.execute('DELETE FROM OwnedGame')
        })
    })
})
