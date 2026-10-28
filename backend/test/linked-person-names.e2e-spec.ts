import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'linked-person-names.e2e.sqlite')
const emoji = (value: string) => ({ backgroundColor: '#2563EB', iconName: null, emoji: value, type: 'emoji', initials: '' })

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

/**
 * A group person with an account shows the account's current name and avatar everywhere in the
 * group, as the member list does. Bruno's row still holds "bruno_old", the copy taken when he
 * joined; Mirian has no account and keeps the name the owner gave her.
 */
describe('names of group people with an account (e2e)', () => {
    let app: INestApplication
    let database: Client
    let groupId: number
    const personOf: Record<'ana' | 'bruno' | 'mirian', number> = { ana: 0, bruno: 0, mirian: 0 }

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
                    (1, 'ana@example.test', 'anita', '${JSON.stringify(emoji('😎'))}', 'Ana Ruiz', 'user_ana'),
                    (2, 'bruno@example.test', 'bruno_old', '${JSON.stringify(emoji('🎲'))}', 'Bruno García', 'user_bruno');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (10, '', 60, 2, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (10, 'en', 'Catan', 'catan');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
                SELECT gameId, languageCode, title, normalizedTitle,
                       ROW_NUMBER() OVER (PARTITION BY gameId ORDER BY languageCode = 'en' DESC, languageCode) = 1
                FROM GameTranslation ORDER BY gameId, languageCode;
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
            .post('/dashboard/users/1/groups/create/tuesday_club')
            .set(auth('user_ana'))
            .expect(201)

        groupId = Number(created.body.groupId)
        // Bruno joined when his name was still "bruno_old", with no avatar of his own yet.
        await database.batch([
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (2, ?)', args: [groupId] },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, 2, 'linked', 'active', 'bruno_old', 1)",
                args: [groupId],
            },
        ])

        const mirian = await request(app.getHttpServer())
            .post(`/groups/${groupId}/people`)
            .set(auth('user_ana'))
            .send({ displayName: 'Mirian' })
            .expect(201)

        personOf.mirian = Number(mirian.body.id)
        const people = await database.execute({
            sql: 'SELECT id, accountId FROM GroupPerson WHERE groupId = ? AND accountId IS NOT NULL',
            args: [groupId],
        })

        for (const row of people.rows) personOf[Number(row.accountId) === 1 ? 'ana' : 'bruno'] = Number(row.id)
        const everyone = [personOf.ana, personOf.bruno, personOf.mirian]

        await request(app.getHttpServer())
            .post('/sessions')
            .set(auth('user_ana'))
            .send({
                groupId,
                sessionDate: '2026-10-02T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: everyone,
                games: [{ gameId: 10, participantPersonIds: everyone }],
            })
            .expect(201)
        // "Ana said Bruno has Catan": the history names Bruno as the person it is about.
        await request(app.getHttpServer())
            .put(`/groups/${groupId}/people/${personOf.bruno}/ownership`)
            .set(auth('user_ana'))
            .send({ gameId: 10, status: 'asserted' })
            .expect(200)
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const people = async () => {
        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/people`).set(auth('user_bruno')).expect(200)

        return new Map<number, { displayName: string; avatar: { emoji?: string } | null }>(
            response.body.people.map((entry: { person: { id: number; displayName: string; avatar: { emoji?: string } | null } }) => [
                entry.person.id,
                entry.person,
            ]),
        )
    }
    const standings = async () => {
        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_ana')).expect(200)

        return new Map<number, { displayName: string; avatar: { emoji?: string } | null }>(
            response.body.standings.map((entry: { groupPersonId: number; displayName: string; avatar: { emoji?: string } | null }) => [
                entry.groupPersonId,
                entry,
            ]),
        )
    }
    /** Every person the group's history names, by id. */
    const historyNames = async () => {
        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/activity`).set(auth('user_ana')).expect(200)
        const names = new Map<number, string>()

        for (const entry of response.body.entries) {
            for (const person of [entry.person, ...(entry.people ?? [])])
                if (person) names.set(person.id, person.name ?? person.displayName)
        }
        return names
    }

    it("shows a member with their account's name and avatar, not the copy taken when they joined", async () => {
        const listed = await people()

        expect(listed.get(personOf.bruno)).toEqual(
            expect.objectContaining({ displayName: 'Bruno García', avatar: expect.objectContaining({ emoji: '🎲' }) }),
        )
        expect(listed.get(personOf.ana)?.displayName).toBe('Ana Ruiz')
        expect(listed.get(personOf.mirian)).toEqual(expect.objectContaining({ displayName: 'Mirian', avatar: null }))
        expect((await standings()).get(personOf.bruno)?.displayName).toBe('Bruno García')
        expect((await historyNames()).get(personOf.bruno)).toBe('Bruno García')
    })

    it('follows a change made in Settings → Profile everywhere in the group', async () => {
        await request(app.getHttpServer())
            .put('/users/2')
            .set(auth('user_bruno'))
            .send({ displayName: 'Zed', avatar: emoji('🦊') })
            .expect(200)

        expect((await people()).get(personOf.bruno)).toEqual(
            expect.objectContaining({ displayName: 'Zed', avatar: expect.objectContaining({ emoji: '🦊' }) }),
        )
        expect((await standings()).get(personOf.bruno)).toEqual(
            expect.objectContaining({ displayName: 'Zed', avatar: expect.objectContaining({ emoji: '🦊' }) }),
        )
        expect((await historyNames()).get(personOf.bruno)).toBe('Zed')
        // Notifications that name a group person ("Ana said Zed has Catan") read the same name.
        const notified = await app.get(DatabaseService).notifications.getContextPeople([personOf.bruno, personOf.mirian])

        expect(notified.rows.map(row => [Number(row.id), String(row.displayName)])).toEqual(
            expect.arrayContaining([
                [personOf.bruno, 'Zed'],
                [personOf.mirian, 'Mirian'],
            ]),
        )
        // Nothing is rewritten: the row keeps its copy, and the name is resolved when read (ADR-0020).
        const row = await database.execute({ sql: 'SELECT displayName FROM GroupPerson WHERE id = ?', args: [personOf.bruno] })

        expect(row.rows[0]?.displayName).toBe('bruno_old')
    })

    // "bruno_old" would sort before Mirian: only the shown name puts Zed last.
    it('sorts the people by the names they show', async () => {
        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/people`).set(auth('user_ana')).expect(200)

        expect(response.body.people.map((entry: { person: { displayName: string } }) => entry.person.displayName)).toEqual([
            'Ana Ruiz',
            'Mirian',
            'Zed',
        ])
    })

    it("lets the owner rename a person without an account, but not a member, whose name is their profile's", async () => {
        const refused = await request(app.getHttpServer())
            .patch(`/groups/${groupId}/people/${personOf.bruno}`)
            .set(auth('user_ana'))
            .send({ displayName: 'Brunito' })
            .expect(400)

        expect(refused.body.message).toBe('A member shows the name and avatar of their own profile')
        expect((await people()).get(personOf.bruno)?.displayName).toBe('Zed')
        await request(app.getHttpServer())
            .patch(`/groups/${groupId}/people/${personOf.bruno}`)
            .set(auth('user_ana'))
            .send({ avatar: emoji('🐸') })
            .expect(400)
        expect((await people()).get(personOf.bruno)?.avatar).toEqual(expect.objectContaining({ emoji: '🦊' }))

        await request(app.getHttpServer())
            .patch(`/groups/${groupId}/people/${personOf.mirian}`)
            .set(auth('user_ana'))
            .send({ displayName: 'Mirian G.' })
            .expect(200)
        expect((await people()).get(personOf.mirian)?.displayName).toBe('Mirian G.')
    })

    it('tells a member changing their own games from someone naming them, in the history and in notifications', async () => {
        // Ana said Zed has Catan; Zed now says they don't, so Ana, who entered it, hears about it.
        await request(app.getHttpServer())
            .put(`/groups/${groupId}/people/${personOf.bruno}/ownership`)
            .set(auth('user_bruno'))
            .send({ gameId: 10, status: 'rejected' })
            .expect(200)

        const history = await request(app.getHttpServer()).get(`/groups/${groupId}/activity`).set(auth('user_ana')).expect(200)
        const [latest] = history.body.entries

        expect(latest).toEqual(
            expect.objectContaining({
                type: 'person_game_set',
                actor: expect.objectContaining({ id: 2 }),
                person: expect.objectContaining({ id: personOf.bruno, accountId: 2 }),
            }),
        )
        const mirianEntry = history.body.entries.find((entry: { person: { id: number } | null }) => entry.person?.id === personOf.mirian)

        expect(mirianEntry?.person).toEqual(expect.objectContaining({ accountId: null }))

        const inbox = await request(app.getHttpServer()).get('/profile/users/1/notifications').set(auth('user_ana')).expect(200)
        const changed = inbox.body.find((item: { type: string }) => item.type === 'group_person_changed')

        expect(changed?.message).toBe('Zed removed Catan from their games in tuesday_club.')
        expect(changed?.context?.people).toEqual([expect.objectContaining({ id: personOf.bruno, name: 'Zed', accountId: 2 })])
    })

    it("keeps the account's name for a member the owner archived, who stands as having left", async () => {
        await request(app.getHttpServer())
            .patch(`/groups/${groupId}/people/${personOf.bruno}`)
            .set(auth('user_ana'))
            .send({ status: 'archived' })
            .expect(200)

        const response = await request(app.getHttpServer())
            .get(`/groups/${groupId}/people?includeArchived=true`)
            .set(auth('user_ana'))
            .expect(200)
        const bruno = response.body.people.find((entry: { person: { id: number } }) => entry.person.id === personOf.bruno)?.person

        expect(bruno).toEqual(expect.objectContaining({ displayName: 'Zed', status: 'archived', standing: 'left' }))
        expect((await historyNames()).get(personOf.bruno)).toBe('Zed')
    })
})
