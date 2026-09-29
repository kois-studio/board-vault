import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcryptjs'
import * as request from 'supertest'

import { AppModule } from './../src/app.module'
import { removeTestDatabase } from './remove-test-database'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'single-user-group-claim.e2e.sqlite')
const testPassword = 'test-password-for-synthetic-fixtures'

const sqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`

describe('single-user group claim workflow (e2e)', () => {
    let app: INestApplication
    let database: Client

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const schema = readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

        execFileSync('sqlite3', [testDatabasePath], { input: schema, encoding: 'utf8' })
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: {
                ...process.env,
                TURSO_DATABASE_URL: `file:${testDatabasePath}`,
                TURSO_AUTH_TOKEN: '',
                MIGRATION_BASELINE: '0005',
            },
            encoding: 'utf8',
        })

        const passwordHash = bcrypt.hashSync(testPassword, 4)
        const avatar = JSON.stringify({
            backgroundColor: '#2563EB',
            iconName: 'person-fill',
            emoji: null,
            type: 'initials',
            initials: 'OR',
        })
        const inviteeAvatar = JSON.stringify({
            backgroundColor: '#F97316',
            iconName: 'person-fill',
            emoji: null,
            type: 'initials',
            initials: 'ME',
        })
        const fixture = `
            PRAGMA foreign_keys = ON;
            INSERT INTO Account (id, email, username, password, avatar, displayName, email_verified)
            VALUES
                (1, 'organizer@example.test', 'organizer', ${sqlLiteral(passwordHash)}, ${sqlLiteral(avatar)}, 'Organizer', TRUE),
                (2, 'member@example.test', 'member', ${sqlLiteral(passwordHash)}, ${sqlLiteral(inviteeAvatar)}, 'Member', TRUE);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
            VALUES
                (10, 'https://example.test/game-10.png', 60, 2, 4),
                (11, 'https://example.test/game-11.png', 90, 2, 4);
            INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle)
            VALUES
                (10, 'en', 'Game Ten', 'game ten'),
                (11, 'en', 'Game Eleven', 'game eleven');
        `

        execFileSync('sqlite3', [testDatabasePath], { input: fixture, encoding: 'utf8' })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.JWT_SECRET = 'single-user-group-claim-secret'
        process.env.RESEND_API_KEY = 're_test_key'
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    async function login(email: string) {
        const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password: testPassword }).expect(201)

        return String(response.body.access_token)
    }

    const withAuth = (token: string) => ({ Authorization: `Bearer ${token}` })

    it('creates phantom people, targets one invitation, and preserves the reviewed claim in the database', async () => {
        const organizerToken = await login('organizer@example.test')
        const memberToken = await login('member@example.test')

        const createdGroup = await request(app.getHttpServer())
            .post('/dashboard/users/1/groups/create/group_example')
            .set(withAuth(organizerToken))
            .send({})
            .expect(201)
        const groupId = Number(createdGroup.body.groupId)

        expect(groupId).toBeGreaterThan(0)

        const anaResponse = await request(app.getHttpServer())
            .post(`/groups/${groupId}/people`)
            .set(withAuth(organizerToken))
            .send({ displayName: 'person_one' })
            .expect(201)
        const anaId = Number(anaResponse.body.id)

        const exampleMemberResponse = await request(app.getHttpServer())
            .post(`/groups/${groupId}/people`)
            .set(withAuth(organizerToken))
            .send({ displayName: 'person_two' })
            .expect(201)
        const exampleMemberId = Number(exampleMemberResponse.body.id)

        await request(app.getHttpServer())
            .put(`/groups/${groupId}/people/${anaId}/ownership`)
            .set(withAuth(organizerToken))
            .send({ gameId: 10, status: 'asserted' })
            .expect(200)
        await request(app.getHttpServer())
            .put(`/groups/${groupId}/people/${anaId}/ownership`)
            .set(withAuth(organizerToken))
            .send({ gameId: 11, status: 'asserted' })
            .expect(200)
        await request(app.getHttpServer())
            .put(`/groups/${groupId}/people/${anaId}/preferences`)
            .set(withAuth(organizerToken))
            .send({ gameId: 10, preference: 'favorite' })
            .expect(200)

        const invitationTarget = await request(app.getHttpServer())
            .post('/invitations/byUsername')
            .set(withAuth(organizerToken))
            .send({ groupId, username: 'member', groupPersonId: anaId })
            .expect(201)

        expect(invitationTarget.body.username).toBe('member')

        const pendingInvitation = await database.execute({
            sql: 'SELECT id, groupPersonId FROM Invitation WHERE groupId = ? AND toAccountId = ?',
            args: [groupId, 2],
        })

        expect(pendingInvitation.rows).toEqual([expect.objectContaining({ id: expect.any(Number), groupPersonId: anaId })])
        const invitationId = Number(pendingInvitation.rows[0].id)

        await request(app.getHttpServer()).post('/memberships').set(withAuth(memberToken)).send({ groupId }).expect(201)

        const memberWorkspace = await request(app.getHttpServer()).get(`/groups/${groupId}/people`).set(withAuth(memberToken)).expect(200)
        const claimablePerson = memberWorkspace.body.people.find((person: { person: { id: number } }) => person.person.id === anaId)

        expect(claimablePerson).toEqual(
            expect.objectContaining({
                claimable: true,
                person: expect.objectContaining({ id: anaId, kind: 'placeholder', accountId: null, displayName: 'person_one' }),
            }),
        )

        await request(app.getHttpServer())
            .post(`/groups/${groupId}/people/${anaId}/claim`)
            .set(withAuth(memberToken))
            .send({ ownershipGameIds: [10], preferenceGameIds: [], importOwnershipToCollection: true })
            .expect(201)

        const claimed = await database.execute({
            sql: 'SELECT id, accountId, kind, claimEmail, claimExpiresAt FROM GroupPerson WHERE id = ?',
            args: [anaId],
        })

        expect(claimed.rows).toEqual([
            expect.objectContaining({ id: anaId, accountId: 2, kind: 'linked', claimEmail: null, claimExpiresAt: null }),
        ])

        const ownership = await database.execute({
            sql: 'SELECT gameId, status, source, enteredByAccountId FROM GroupPersonGameOwnership WHERE groupPersonId = ? ORDER BY gameId',
            args: [anaId],
        })

        expect(ownership.rows).toEqual([
            { gameId: 10, status: 'asserted', source: 'claimed_import', enteredByAccountId: 2 },
            { gameId: 11, status: 'rejected', source: 'claimed_import', enteredByAccountId: 2 },
        ])

        const preferences = await database.execute({
            sql: 'SELECT gameId FROM GroupPersonGamePreference WHERE groupPersonId = ?',
            args: [anaId],
        })

        expect(preferences.rows).toEqual([])

        const privateCollection = await database.execute({
            sql: 'SELECT gameId FROM OwnedGame WHERE accountId = ? ORDER BY gameId',
            args: [2],
        })

        expect(privateCollection.rows).toEqual([{ gameId: 10 }])

        const groupPeople = await database.execute({
            sql: "SELECT accountId, kind FROM GroupPerson WHERE groupId = ? AND status = 'active' ORDER BY id",
            args: [groupId],
        })

        expect(groupPeople.rows).toEqual([
            { accountId: 1, kind: 'linked' },
            { accountId: 2, kind: 'linked' },
            { accountId: null, kind: 'placeholder' },
        ])

        const invitationCount = await database.execute({
            sql: 'SELECT COUNT(*) FROM Invitation WHERE id = ?',
            args: [invitationId],
        })

        expect(Number(Object.values(invitationCount.rows[0])[0])).toBe(0)

        await request(app.getHttpServer())
            .post(`/groups/${groupId}/people/${anaId}/claim`)
            .set(withAuth(memberToken))
            .send({ ownershipGameIds: [10], preferenceGameIds: [], importOwnershipToCollection: true })
            .expect(201)
            .expect({ success: true, alreadyClaimed: true })

        const remainingPlaceholder = await database.execute({
            sql: "SELECT id FROM GroupPerson WHERE id = ? AND accountId IS NULL AND kind = 'placeholder'",
            args: [exampleMemberId],
        })

        expect(remainingPlaceholder.rows).toEqual([{ id: exampleMemberId }])
    })
})
