import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'group-history.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

type Entry = {
    id: number
    type: string
    actor: { id: number; name: string; standing: string }
    person: { id: number; name: string } | null
    game: { id: number; title: string | null } | null
    subject: { id: number; name: string; standing: string } | null
    data: Record<string, unknown>
    games: Array<{ id: number; title: string | null }>
}

// ADR-0020: who changed what in a group, written with the change, readable by members only, never rewritten.
describe('group history (e2e)', () => {
    let app: INestApplication

    const sql = (input: string) => execFileSync('sqlite3', [testDatabasePath], { input, encoding: 'utf8' })

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        sql(readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8'))
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        // Olga owns Fridays, with Paula and Rita. Pedro has no account. Ugo is in another group.
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                (2, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                (3, 'rita@example.test', 'ritaplays', ${avatar}, 'Rita', 'user_rita', 0, 0),
                (4, 'ugo@example.test', 'ugoplays', ${avatar}, 'Ugo', 'user_ugo', 0, 0);
            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1), (20, 'Elsewhere', 4);
            INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 10), (4, 20);
            INSERT INTO GroupPerson (id, groupId, kind, status, displayName, createdByAccountId) VALUES (7, 10, 'placeholder', 'active', 'Pedro', 1);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                (1, 'https://example.test/azul.jpg', 45, 2, 4), (2, 'https://example.test/catan.jpg', 90, 3, 4);
            INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (1, 'en', 'Azul', 'azul'), (2, 'en', 'Catan', 'catan');
            INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 1);
        `)

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
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const history = async (clerkUserId = 'user_rita', query = ''): Promise<{ entries: Array<Entry>; hasMore: boolean }> =>
        (await request(app.getHttpServer()).get(`/groups/10/activity${query}`).set(as(clerkUserId)).expect(200)).body

    it('lets any member change what a group person owns, and records who did', async () => {
        await request(app.getHttpServer())
            .put('/groups/10/people/7/ownership')
            .set(as('user_pau'))
            .send({ gameId: 2, status: 'asserted' })
            .expect(200)
        await request(app.getHttpServer())
            .put('/groups/10/people/7/ownership')
            .set(as('user_rita'))
            .send({ gameId: 2, status: 'rejected' })
            .expect(200)

        const { entries } = await history()

        expect(entries.slice(0, 2)).toEqual([
            expect.objectContaining({
                type: 'person_game_set',
                actor: { id: 3, name: 'Rita', standing: 'member' },
                person: { id: 7, name: 'Pedro', standing: 'member' },
                game: { id: 2, title: 'Catan' },
                data: { status: 'rejected', previousStatus: 'asserted' },
            }),
            expect.objectContaining({
                type: 'person_game_set',
                actor: expect.objectContaining({ name: 'Paula' }),
                data: { status: 'asserted', previousStatus: null },
            }),
        ])
    })

    it('tells the member whose entry someone else undid', async () => {
        const inbox = (await request(app.getHttpServer()).get('/profile/users/2/notifications').set(as('user_pau')).expect(200))
            .body as Array<{ type: string; message: string }>

        expect(inbox).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ type: 'group_person_changed', message: "Rita removed Catan from Pedro's games in Fridays." }),
            ]),
        )
    })

    it('records a game night and its changes, one entry per change', async () => {
        const planned = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(as('user_pau'))
            .send({ groupId: 10, sessionDate: '2026-11-06T19:00:00.000Z', timezone: 'Europe/Madrid', attendeeIds: [2, 3] })
            .expect(201)
        const sessionId = Number(planned.body.sessionId)

        await request(app.getHttpServer()).post(`/sessions/${sessionId}/shortlist/1`).set(as('user_rita')).expect(201)
        // Adding a game already on the shortlist is not news.
        await request(app.getHttpServer()).post(`/sessions/${sessionId}/shortlist/1`).set(as('user_rita')).expect(201)
        await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/rsvp`)
            .set(as('user_rita'))
            .send({ rsvpStatus: 'accepted' })
            .expect(200)
        await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/status`)
            .set(as('user_rita'))
            .send({ status: 'active' })
            .expect(200)

        const { entries } = await history()

        expect(entries.slice(0, 4).map(entry => [entry.type, entry.actor.name])).toEqual([
            ['session_started', 'Rita'],
            ['session_rsvp', 'Rita'],
            ['session_shortlist_changed', 'Rita'],
            ['session_planned', 'Paula'],
        ])
        expect(entries[2]?.games).toEqual([{ id: 1, title: 'Azul' }])
    })

    it('pages newest first', async () => {
        const first = await history('user_rita', '?limit=2')
        const second = await history('user_rita', `?limit=2&before=${first.entries[1]?.id}`)

        expect(first.entries).toHaveLength(2)
        expect(first.hasMore).toBe(true)
        expect(second.entries[0]?.id).toBeLessThan(first.entries[1]?.id ?? 0)
    })

    it('shows the history only to members of the group', async () => {
        await request(app.getHttpServer()).get('/groups/10/activity').set(as('user_ugo')).expect(403)
    })

    it('records someone removed by the owner, and still names them after they left', async () => {
        await request(app.getHttpServer()).delete('/dashboard/users/1/groups/10/members/3').set(as('user_olga')).expect(200)

        const [removed] = (await history('user_pau')).entries

        expect(removed).toEqual(
            expect.objectContaining({
                type: 'member_removed',
                actor: expect.objectContaining({ name: 'Olga' }),
                subject: { id: 3, name: 'Rita', standing: 'left' },
            }),
        )
        // Entries Rita wrote stay hers, under her standing (ADR-0018).
        expect((await history('user_pau')).entries.find(entry => entry.type === 'session_started')?.actor).toEqual({
            id: 3,
            name: 'Rita',
            standing: 'left',
        })
        // And Rita, no longer a member, cannot read it.
        await request(app.getHttpServer()).get('/groups/10/activity').set(as('user_rita')).expect(403)
    })

    it('refuses to change or delete an entry while the group exists', () => {
        expect(() => sql("UPDATE GroupActivity SET type = 'member_left' WHERE groupId = 10;")).toThrow(/append-only/)
        expect(() => sql('DELETE FROM GroupActivity WHERE groupId = 10;')).toThrow(/append-only/)
    })

    it('goes with the group when the group is deleted', async () => {
        await request(app.getHttpServer()).delete('/dashboard/users/1/groups/10').set(as('user_olga')).expect(200)

        expect(sql('SELECT COUNT(*) FROM GroupActivity WHERE groupId = 10;').trim()).toBe('0')
    })
})
