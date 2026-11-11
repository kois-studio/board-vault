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
const testDatabasePath = resolve(__dirname, 'group-of-user.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

// #258: a session page asks for its own group, not every group of the user.
describe('one group of a user (e2e)', () => {
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
        // Olga owns Fridays, with Paula. Ugo is in another group. Paula owns Azul and rated it.
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                (2, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                (4, 'ugo@example.test', 'ugoplays', ${avatar}, 'Ugo', 'user_ugo', 0, 0);
            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1), (20, 'Elsewhere', 4);
            INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (4, 20);
            INSERT INTO GroupPerson (id, groupId, kind, status, displayName, createdByAccountId) VALUES (7, 10, 'placeholder', 'active', 'Pedro', 1);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (1, 'https://example.test/azul.jpg', 45, 2, 4);
            INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (1, 'en', 'Azul', 'azul');
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (1, 'en', 'Azul', 'azul', 1);
            INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 1);
            INSERT INTO GameReview (accountId, gameId, review) VALUES (2, 1, 8);
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

    it('answers a member with the group as in the list of all groups', async () => {
        const one = (await request(app.getHttpServer()).get('/dashboard/users/1/groups/10').set(as('user_olga')).expect(200)).body
        const all = (await request(app.getHttpServer()).get('/dashboard/users/1/groups').set(as('user_olga')).expect(200)).body

        expect(all).toHaveLength(1)
        expect(one).toEqual(all[0])
        expect(one.members.map((member: { id: number }) => member.id).sort()).toEqual([1, 2])
        const paula = one.members.find((member: { id: number }) => member.id === 2)

        expect(paula.games.map((game: { id: number }) => game.id)).toEqual([1])
        expect(paula.reviews.map((review: { gameId: number; review: number }) => [review.gameId, review.review])).toEqual([[1, 8]])
        expect(one.placeholders.map((person: { displayName: string }) => person.displayName)).toEqual(['Pedro'])
        // Private data never leaves: no email on members.
        expect(JSON.stringify(one)).not.toContain('@example.test')
    })

    it('refuses a group the caller is not in, and another user’s address', async () => {
        await request(app.getHttpServer()).get('/dashboard/users/4/groups/10').set(as('user_ugo')).expect(403)
        await request(app.getHttpServer()).get('/dashboard/users/1/groups/10').set(as('user_pau')).expect(403)
        await request(app.getHttpServer()).get('/dashboard/users/1/groups/10').expect(401)
    })
})
