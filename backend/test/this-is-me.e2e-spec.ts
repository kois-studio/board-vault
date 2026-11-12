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
const testDatabasePath = resolve(__dirname, 'this-is-me.e2e.sqlite')
const AVATAR = JSON.stringify({ backgroundColor: '#2563EB', iconName: 'person-fill', emoji: null, type: 'initials', initials: 'BV' })

/**
 * "This is me" (#278, ADR-0027): someone who joins picks who they are among the group's people without an account,
 * and the group can undo a wrong pick for 30 days.
 */
describe('"this is me" and undoing a takeover (e2e)', () => {
    let app: INestApplication
    let database: Client

    const organizer = { Authorization: `Bearer ${sessionFor('user_organizer')}` }
    const member = { Authorization: `Bearer ${sessionFor('user_member')}` }
    const other = { Authorization: `Bearer ${sessionFor('user_other')}` }

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
                    (1, 'organizer@example.test', 'organizer', '${AVATAR}', 'Organizer', 'user_organizer'),
                    (2, 'member@example.test', 'member', '${AVATAR}', 'Member', 'user_member'),
                    (3, 'other@example.test', 'other', '${AVATAR}', 'Other', 'user_other');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
                VALUES (10, '/artwork/10.webp', 60, 2, 4), (11, '/artwork/11.webp', 90, 2, 4), (12, '/artwork/12.webp', 30, 2, 6);
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
                VALUES (10, 'en', 'Game Ten', 'game ten', 1), (11, 'en', 'Game Eleven', 'game eleven', 1),
                       (12, 'en', 'Game Twelve', 'game twelve', 1);
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
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const api = () => request(app.getHttpServer())

    async function recordNight(
        as: Record<string, string>,
        groupId: number,
        date: string,
        people: Array<number>,
        gameId: number,
        winner: number,
    ) {
        const created = await api()
            .post('/sessions')
            .set(as)
            .send({
                groupId,
                sessionDate: date,
                timezone: 'Europe/Madrid',
                groupPersonIds: people,
                games: [{ gameId, participantPersonIds: people, results: [{ groupPersonId: winner, isWinner: true, score: 10 }] }],
            })
            .expect(201)

        return Number(created.body.sessionId)
    }

    async function personIdsOn(meetId: number) {
        const rows = await database.execute({
            sql: 'SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ? ORDER BY groupPersonId',
            args: [meetId],
        })

        return rows.rows.map(row => Number(row.groupPersonId))
    }

    it('lets a new member pick who they are, and lets the group undo it', async () => {
        const groupId = Number(
            (await api().post('/dashboard/users/1/groups/create/group_example').set(organizer).send({}).expect(201)).body.groupId,
        )
        const carlos = Number(
            (await api().post(`/groups/${groupId}/people`).set(organizer).send({ displayName: 'Carlos' }).expect(201)).body.id,
        )
        const dana = Number(
            (await api().post(`/groups/${groupId}/people`).set(organizer).send({ displayName: 'Dana' }).expect(201)).body.id,
        )
        const organizerPerson = Number(
            (await database.execute({ sql: 'SELECT id FROM GroupPerson WHERE groupId = ? AND accountId = 1', args: [groupId] })).rows[0]
                ?.id,
        )

        await api().put(`/groups/${groupId}/people/${carlos}/ownership`).set(organizer).send({ gameId: 10, status: 'asserted' }).expect(200)
        await api()
            .put(`/groups/${groupId}/people/${carlos}/preferences`)
            .set(organizer)
            .send({ gameId: 11, preference: 'like' })
            .expect(200)
        const before = await recordNight(organizer, groupId, '2026-10-03T19:00:00.000Z', [organizerPerson, carlos], 10, carlos)

        // Invited without a suggestion: accepting asks them who they are, with no new person yet.
        await api().post('/invitations/byUsername').set(organizer).send({ groupId, username: 'member' }).expect(201)
        const invitationId = Number(
            (await database.execute({ sql: 'SELECT id FROM Invitation WHERE groupId = ? AND toAccountId = 2', args: [groupId] })).rows[0]
                ?.id,
        )

        await api()
            .post(`/profile/users/2/invitations/${invitationId}/accept`)
            .set(member)
            .expect(201)
            .expect({ success: true, groupId, choosePerson: true })
        expect(
            (await database.execute({ sql: 'SELECT COUNT(*) AS n FROM GroupPerson WHERE groupId = ? AND accountId = 2', args: [groupId] }))
                .rows[0]?.n,
        ).toBe(0)

        const choices = (await api().get(`/groups/${groupId}/people/choices`).set(member).expect(200)).body.choices

        expect(choices).toEqual([
            expect.objectContaining({
                person: expect.objectContaining({ id: carlos, displayName: 'Carlos', kind: 'placeholder' }),
                suggested: false,
                games: [{ id: 10, title: 'Game Ten' }],
                nights: 1,
                lastNight: expect.stringContaining('2026-10-03'),
            }),
            expect.objectContaining({ person: expect.objectContaining({ id: dana }), games: [], nights: 0, lastNight: null }),
        ])
        // Someone who is one of the group's people already has no one to choose.
        await api().get(`/groups/${groupId}/people/choices`).set(organizer).expect(200).expect({ choices: [] })

        // They take over Carlos, dropping his game and preference.
        await api()
            .post(`/groups/${groupId}/people/${carlos}/claim`)
            .set(member)
            .send({ ownershipGameIds: [], preferenceGameIds: [] })
            .expect(201)

        // As Carlos's person they come to a night and say they have another game.
        const after = await recordNight(member, groupId, '2026-11-08T19:00:00.000Z', [organizerPerson, carlos], 11, carlos)

        await api().put(`/groups/${groupId}/people/${carlos}/ownership`).set(member).send({ gameId: 12, status: 'asserted' }).expect(200)
        // An outsider cannot see or undo anything.
        await api().get(`/groups/${groupId}/people/takeovers`).set(other).expect(403)
        await api().post(`/groups/${groupId}/people/${carlos}/takeover/undo`).set(other).expect(403)

        const takeovers = (await api().get(`/groups/${groupId}/people/takeovers`).set(organizer).expect(200)).body.takeovers

        expect(takeovers).toEqual([
            {
                groupPersonId: carlos,
                accountId: 2,
                previousName: 'Carlos',
                takenAt: expect.any(String),
                undoableUntil: expect.any(String),
            },
        ])

        // The organizer undoes it.
        const undone = (await api().post(`/groups/${groupId}/people/${carlos}/takeover/undo`).set(organizer).expect(200)).body
        const newPerson = Number(undone.newPersonId)

        expect(undone).toEqual({ groupPersonId: carlos, newPersonId: expect.any(Number) })

        // Carlos is back as he was: no account, his name, his game and preference.
        expect(
            (
                await database.execute({
                    sql: 'SELECT accountId, kind, displayName, claimedAt FROM GroupPerson WHERE id = ?',
                    args: [carlos],
                })
            ).rows,
        ).toEqual([{ accountId: null, kind: 'placeholder', displayName: 'Carlos', claimedAt: null }])
        expect(
            (
                await database.execute({
                    sql: 'SELECT gameId, status, source, enteredByAccountId FROM GroupPersonGameOwnership WHERE groupPersonId = ?',
                    args: [carlos],
                })
            ).rows,
        ).toEqual([{ gameId: 10, status: 'asserted', source: 'placeholder_setup', enteredByAccountId: 1 }])
        expect(
            (
                await database.execute({
                    sql: 'SELECT gameId, preference FROM GroupPersonGamePreference WHERE groupPersonId = ?',
                    args: [carlos],
                })
            ).rows,
        ).toEqual([{ gameId: 11, preference: 'like' }])

        // The member is a person of their own, with what they added after the takeover.
        expect(
            (await database.execute({ sql: 'SELECT groupId, accountId, kind FROM GroupPerson WHERE id = ?', args: [newPerson] })).rows,
        ).toEqual([{ groupId, accountId: 2, kind: 'linked' }])
        expect(
            (
                await database.execute({
                    sql: 'SELECT gameId, status FROM GroupPersonGameOwnership WHERE groupPersonId = ?',
                    args: [newPerson],
                })
            ).rows,
        ).toEqual([{ gameId: 12, status: 'asserted' }])

        // The night before the takeover keeps Carlos; the one after is the member's, plays and results included.
        expect(await personIdsOn(before)).toEqual([organizerPerson, carlos].sort((a, b) => a - b))
        expect(await personIdsOn(after)).toEqual([organizerPerson, newPerson].sort((a, b) => a - b))
        const recording = (await api().get(`/sessions/${after}/recording`).set(organizer).expect(200)).body

        expect(recording.games[0].participantPersonIds).toEqual([organizerPerson, newPerson])
        expect(recording.games[0].results).toEqual([expect.objectContaining({ groupPersonId: newPerson, isWinner: true })])
        expect(
            (await database.execute({ sql: 'SELECT groupPersonId FROM MeetGameResult WHERE meetId = ?', args: [after] })).rows.map(row =>
                Number(row.groupPersonId),
            ),
        ).toEqual([newPerson])

        // The history says so, and the member is told.
        const history = (await api().get(`/groups/${groupId}/activity`).set(organizer).expect(200)).body.entries

        expect(history[0]).toEqual(
            expect.objectContaining({
                type: 'person_takeover_undone',
                actor: expect.objectContaining({ id: 1 }),
                person: expect.objectContaining({ id: carlos, name: 'Carlos', accountId: null }),
                subject: expect.objectContaining({ id: 2, name: 'Member' }),
                data: { newPersonId: newPerson },
            }),
        )
        const notifications = await database.execute({
            sql: "SELECT data FROM Notification WHERE accountId = 2 AND type = 'group_person_takeover_undone'",
            args: [],
        })

        expect(notifications.rows.map(row => JSON.parse(String(row.data)))).toEqual([{ account: 1, group: groupId, person: carlos }])

        // Once undone, there is nothing left to undo, and Carlos can be chosen again by someone else.
        await api().post(`/groups/${groupId}/people/${carlos}/takeover/undo`).set(organizer).expect(404)
        await api().get(`/groups/${groupId}/people/takeovers`).set(organizer).expect(200).expect({ takeovers: [] })
    })

    it('stops offering undo after 30 days', async () => {
        const groupId = Number(
            (await api().post('/dashboard/users/1/groups/create/group_second').set(organizer).send({}).expect(201)).body.groupId,
        )
        const erin = Number(
            (await api().post(`/groups/${groupId}/people`).set(organizer).send({ displayName: 'Erin' }).expect(201)).body.id,
        )

        await api().post('/invitations/byUsername').set(organizer).send({ groupId, username: 'other', groupPersonId: erin }).expect(201)
        await api().post('/memberships').set(other).send({ groupId }).expect(201).expect({ success: true, groupId, choosePerson: true })
        const [choice] = (await api().get(`/groups/${groupId}/people/choices`).set(other).expect(200)).body.choices

        expect(choice).toEqual(expect.objectContaining({ suggested: true, person: expect.objectContaining({ id: erin }) }))
        await api().post(`/groups/${groupId}/people/${erin}/claim`).set(other).send({}).expect(201)
        await database.execute({
            sql: "UPDATE GroupPersonTakeover SET createdAt = datetime('now', '-31 days') WHERE groupPersonId = ?",
            args: [erin],
        })

        await api().get(`/groups/${groupId}/people/takeovers`).set(organizer).expect(200).expect({ takeovers: [] })
        await api().post(`/groups/${groupId}/people/${erin}/takeover/undo`).set(organizer).expect(404)
        expect((await database.execute({ sql: 'SELECT accountId FROM GroupPerson WHERE id = ?', args: [erin] })).rows).toEqual([
            { accountId: 3 },
        ])
    })
})
