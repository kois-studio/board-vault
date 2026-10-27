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
const testDatabasePath = resolve(__dirname, 'resolved-titles.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

type Titled = { id: number; title: string; titleLanguage: string; titleTranslations: Record<string, string> }

/** ADR-0025: a game shows the edition in the reader's language, then the primary edition. */
describe('resolved game titles (e2e)', () => {
    let app: INestApplication

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
                    (1, 'ana@example.test', 'ana_ruiz', ${avatar}, 'Ana Ruiz', 'user_ana', 0, 0),
                    (2, 'bruno@example.test', 'bruno', ${avatar}, 'Bruno', 'user_bruno', 0, 0);
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, '', 30, 2, 8), (2, '', 45, 1, 2);
                -- Game 1 has English (primary) and Spanish editions; game 2 only a German one.
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                    (1, 'en', 'Codenames', 'codenames', 1), (1, 'es', 'Código Secreto', 'codigo-secreto', 0),
                    (2, 'de', 'Bärenpark', 'barenpark', 1);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10);
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 1), (1, 2), (2, 1), (2, 2);
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
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const summary = (games: Array<Titled>) =>
        Object.fromEntries(games.map(game => [game.id, [game.title, game.titleLanguage]])) as Record<number, [string, string]>

    const readers = [
        { language: 'es', codenames: ['Código Secreto', 'es'] },
        { language: 'en', codenames: ['Codenames', 'en'] },
    ]

    it.each(readers)("shows a group's library in the $language reader's language", async ({ language, codenames }) => {
        const response = await request(app.getHttpServer())
            .get('/groups/10/collection')
            .set(as('user_bruno'))
            .set('Accept-Language', language)
            .expect(200)
        const games = response.body.people[0].games as Array<Titled>

        // A game with only a German edition shows it to everyone.
        expect(summary(games)).toEqual({ 1: codenames, 2: ['Bärenpark', 'de'] })
    })

    it.each(readers)('recommends games by their title in the $language reader’s language', async ({ language, codenames }) => {
        const response = await request(app.getHttpServer())
            .post('/play/recommendations')
            .set(as('user_bruno'))
            .set('Accept-Language', language)
            .send({ groupId: 10, attendeeIds: [1, 2] })
            .expect(201)
        const games = response.body.recommendations.map((recommendation: { gameData: Titled }) => recommendation.gameData) as Array<Titled>

        expect(summary(games)).toEqual({ 1: codenames, 2: ['Bärenpark', 'de'] })
    })

    it('names games in the insights and the shelf the same way, and keeps every edition for "also known as"', async () => {
        const insights = await request(app.getHttpServer())
            .get('/groups/10/insights')
            .set(as('user_bruno'))
            .set('Accept-Language', 'es')
            .expect(200)

        expect(summary(insights.body.neverPlayed)).toEqual({ 1: ['Código Secreto', 'es'], 2: ['Bärenpark', 'de'] })

        const shelf = await request(app.getHttpServer())
            .get('/collection/users/2/games')
            .set(as('user_bruno'))
            .set('Accept-Language', 'es')
            .expect(200)
        const codenames = (shelf.body as Array<Titled>).find(game => game.id === 1)

        expect(summary(shelf.body)).toEqual({ 1: ['Código Secreto', 'es'], 2: ['Bärenpark', 'de'] })
        expect(codenames?.titleTranslations).toEqual({ en: 'Codenames', es: 'Código Secreto' })
    })

    it('shows a language without an edition the primary one', async () => {
        const response = await request(app.getHttpServer())
            .get('/groups/10/collection')
            .set(as('user_bruno'))
            .set('Accept-Language', 'fr')
            .expect(200)

        expect(summary(response.body.people[0].games)).toEqual({ 1: ['Codenames', 'en'], 2: ['Bärenpark', 'de'] })
    })
})
