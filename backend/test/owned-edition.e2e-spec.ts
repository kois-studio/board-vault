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
const testDatabasePath = resolve(__dirname, 'owned-edition.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

type Titled = { id: number; title: string; titleLanguage: string; ownedEditionId?: number | null }
type Edition = { id: number; languageCode: string; title: string; isPrimary: boolean }

/** ADR-0025: someone's copy shows the edition they own; everywhere else the reader's language decides. */
describe('owned game edition (e2e)', () => {
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
                    (1, 'admin@example.test', 'admin', ${avatar}, 'Admin', 'user_admin', 1, 0),
                    (2, 'ana@example.test', 'ana_ruiz', ${avatar}, 'Ana Ruiz', 'user_ana', 0, 0),
                    (3, 'bruno@example.test', 'bruno', ${avatar}, 'Bruno', 'user_bruno', 0, 0);
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, '', 30, 2, 8), (2, '', 45, 1, 2), (3, '', 20, 2, 4);
                -- Game 1: English (primary) and Spanish. Game 2: only German. Game 3: English (primary) and French.
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Codenames', 'codenames'), (1, 'es', 'Código Secreto', 'codigo-secreto'),
                    (2, 'de', 'Bärenpark', 'barenpark'),
                    (3, 'en', 'Citadels', 'citadels'), (3, 'fr', 'Citadelles', 'citadelles');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                    (1, 'en', 'Codenames', 'codenames', 1), (1, 'es', 'Código Secreto', 'codigo-secreto', 0),
                    (2, 'de', 'Bärenpark', 'barenpark', 1),
                    (3, 'en', 'Citadels', 'citadels', 1), (3, 'fr', 'Citadelles', 'citadelles', 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 2);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (2, 10), (3, 10);
                INSERT INTO GroupPerson (id, groupId, accountId, kind, displayName, createdByAccountId) VALUES
                    (20, 10, 2, 'linked', 'Ana Ruiz', 2);
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (60, 10, 2, '2026-10-09T17:00:00.000Z', 0, 'scheduled', 'Europe/Madrid');
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                    (60, 2, 'accepted', 'unknown'), (60, 3, 'accepted', 'unknown');
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

    const server = () => request(app.getHttpServer())
    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const editionsOf = async (gameId: number) =>
        (await server().get(`/collection/games/${gameId}/editions`).set(as('user_ana')).expect(200)).body as Array<Edition>
    const editionId = async (gameId: number, languageCode: string) =>
        (await editionsOf(gameId)).find(e => e.languageCode === languageCode)!.id
    const shelf = async (clerkUserId: string, userId: number, language = 'es') =>
        Object.fromEntries(
            (
                (await server().get(`/collection/users/${userId}/games`).set(as(clerkUserId)).set('Accept-Language', language).expect(200))
                    .body as Array<Titled>
            ).map(game => [game.id, [game.title, game.titleLanguage, game.ownedEditionId]]),
        )

    it('lists a game’s editions, the primary one first', async () => {
        expect((await editionsOf(1)).map(edition => [edition.languageCode, edition.isPrimary])).toEqual([
            ['en', true],
            ['es', false],
        ])
    })

    it('shelves a game in the English edition for a Spanish reader, while Browse stays Spanish', async () => {
        const english = await editionId(1, 'en')

        await server().post('/collection/users/2/games/1').set(as('user_ana')).send({ editionId: english }).expect(201)
        // A game with one edition needs no answer; a game with several and no answer is "not said".
        await server().post('/collection/users/2/games/2').set(as('user_ana')).send({}).expect(201)
        await server().post('/collection/users/2/games/3').set(as('user_ana')).expect(201)

        expect(await shelf('user_ana', 2)).toEqual({
            1: ['Codenames', 'en', english],
            2: ['Bärenpark', 'de', null],
            3: ['Citadels', 'en', null],
        })

        const browse = await server()
            .get('/collection/users/2/browse/games')
            .query({ search: 'codenames' })
            .set(as('user_ana'))
            .set('Accept-Language', 'es')
            .expect(200)

        expect(browse.body.games.map((game: Titled) => [game.title, game.titleLanguage])).toEqual([['Código Secreto', 'es']])
    })

    it('reaches the shelf owner’s copy in the game view, but not another reader’s heading', async () => {
        const english = await editionId(1, 'en')
        const view = (await server().get('/collection/users/2/games/1').set(as('user_ana')).set('Accept-Language', 'es').expect(200)).body

        expect(view.gameData).toEqual(expect.objectContaining({ title: 'Código Secreto', titleLanguage: 'es' }))
        expect(view.ownedGameData).toEqual(expect.objectContaining({ editionId: english, title: 'Codenames', titleLanguage: 'en' }))
        expect(view.editions.map((edition: Edition) => edition.languageCode)).toEqual(['en', 'es'])
    })

    it('shows the edition of the copy to who brings the game, and for a group person linked to the account', async () => {
        const english = await editionId(1, 'en')

        await server().post('/sessions/60/shortlist/1').set(as('user_ana')).expect(201)
        await server().put('/sessions/60/games/1/bringer').set(as('user_ana')).send({}).expect(200)

        const night = (await server().get('/sessions/60').set(as('user_ana')).expect(200)).body

        expect(night.gameBringers).toEqual([
            { gameId: 1, accountId: 2, groupPersonId: null, copyTitle: 'Codenames', copyTitleLanguage: 'en' },
        ])

        const ownership = (await server().get('/groups/10/people/20/ownership').set(as('user_ana')).expect(200)).body as Array<{
            gameId: number
            copyTitle: string | null
            copyTitleLanguage: string | null
        }>

        expect(ownership.map(item => [item.gameId, item.copyTitle, item.copyTitleLanguage])).toEqual([
            [1, 'Codenames', 'en'],
            [2, null, null],
            [3, null, null],
        ])
        expect(english).toBeGreaterThan(0)
    })

    it('refuses an edition of another game, on adding and on changing', async () => {
        const french = await editionId(3, 'fr')

        await server().post('/collection/users/3/games/1').set(as('user_bruno')).send({ editionId: french }).expect(400)
        await server().patch('/collection/users/2/games/1/edition').set(as('user_ana')).send({ editionId: french }).expect(400)
        await server().patch('/collection/users/2/games/1/edition').set(as('user_ana')).send({ editionId: 'x' }).expect(400)
        // A refused add leaves nothing on the shelf.
        expect(await shelf('user_bruno', 3)).toEqual({})
    })

    it('changes and clears the edition, for the owner only', async () => {
        const spanish = await editionId(1, 'es')
        const french = await editionId(3, 'fr')

        await server().patch('/collection/users/2/games/1/edition').set(as('user_ana')).send({ editionId: spanish }).expect(200)
        expect((await shelf('user_ana', 2, 'en'))[1]).toEqual(['Código Secreto', 'es', spanish])

        await server().patch('/collection/users/2/games/3/edition').set(as('user_ana')).send({ editionId: french }).expect(200)
        expect((await shelf('user_ana', 2, 'en'))[3]).toEqual(['Citadelles', 'fr', french])

        await server().patch('/collection/users/2/games/1/edition').set(as('user_ana')).send({ editionId: null }).expect(200)
        expect((await shelf('user_ana', 2, 'es'))[1]).toEqual(['Código Secreto', 'es', null])
        expect((await shelf('user_ana', 2, 'en'))[1]).toEqual(['Codenames', 'en', null])

        // Not someone else's shelf, and not a game that is not on the shelf.
        await server().patch('/collection/users/2/games/3/edition').set(as('user_bruno')).send({ editionId: null }).expect(403)
        await server().patch('/collection/users/3/games/1/edition').set(as('user_bruno')).send({ editionId: spanish }).expect(404)
    })

    it('puts a copy back to "not said" when an admin removes its edition', async () => {
        const french = await editionId(3, 'fr')

        expect((await shelf('user_ana', 2, 'en'))[3]).toEqual(['Citadelles', 'fr', french])
        await server()
            .patch('/admin/games/3')
            .set(as('user_admin'))
            .send({ editions: [{ languageCode: 'en', title: 'Citadels', isPrimary: true }] })
            .expect(200)

        expect((await shelf('user_ana', 2, 'fr'))[3]).toEqual(['Citadels', 'en', null])
    })
})
