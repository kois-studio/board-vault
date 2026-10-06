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
const testDatabasePath = resolve(__dirname, 'ratings-and-search.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('rating averages, rating activity, and title search (e2e)', () => {
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
        // Ana and Ben share two groups and Dan shares one with Ana; Cleo shares none and is an admin.
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana Ruiz', 'user_ana', 0, 0),
                    (2, 'ben@example.test', 'benplays', ${avatar}, 'Ben Soto', 'user_ben', 0, 0),
                    (3, 'dan@example.test', 'danplays', ${avatar}, 'Dan Vega', 'user_dan', 0, 0),
                    (4, 'cleo@example.test', 'cleoadmin', ${avatar}, 'Cleo Mora', 'user_cleo', 1, 0);

                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 1), (11, 'Weekends', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 10), (1, 11), (2, 11);

                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, 'https://example.test/under-score.jpg', 30, 2, 4),
                    (3, 'https://example.test/catan.jpg', 90, 3, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (1, 'es', 'Azul', 'azul'),
                    (2, 'en', 'Under_Score', 'under_score'), (2, 'es', 'Under_Score', 'under_score'),
                    (3, 'en', 'Catan', 'catan'), (3, 'es', 'Catan', 'catan');

                INSERT INTO GameReview (accountId, gameId, review) VALUES (1, 1, 6), (2, 1, 10), (3, 1, 2), (4, 1, 4);
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

    async function ratingsOfAzulFor(userId: number, clerkUserId: string) {
        const response = await request(app.getHttpServer()).get(`/collection/users/${userId}/games/1`).set(as(clerkUserId)).expect(200)

        return { groups: response.body.ratingData.avgGroupsRating, everyone: response.body.ratingData.avgGlobalRating }
    }

    describe('rating averages', () => {
        it('counts each group rating once, however many groups its author shares', async () => {
            // Ana's groups hold Ana (6), Ben (10, two shared groups) and Dan (2): three ratings, average 6.
            expect(await ratingsOfAzulFor(1, 'user_ana')).toEqual({
                groups: { review: 6, count: 3 },
                everyone: { review: 5.5, count: 4 },
            })
        })

        it('never counts more group ratings than there are ratings at all', async () => {
            for (const [userId, clerkUserId] of [
                [1, 'user_ana'],
                [2, 'user_ben'],
                [3, 'user_dan'],
            ] as const) {
                const { groups, everyone } = await ratingsOfAzulFor(userId, clerkUserId)

                expect(groups.count).toBeLessThanOrEqual(everyone.count)
            }
        })

        it('leaves out the ratings of people who share no group', async () => {
            // Ben's groups are Ana's two; Dan only shares Thursdays with both. Cleo's 4 never counts.
            expect((await ratingsOfAzulFor(2, 'user_ben')).groups).toEqual({ review: 6, count: 3 })
            expect((await ratingsOfAzulFor(4, 'user_cleo')).groups).toEqual({ review: 0, count: 0 })
        })
    })

    describe('rating activity', () => {
        const activityOf = async () =>
            (await request(app.getHttpServer()).get('/collection/users/1/recent-activity').set(as('user_ana')).expect(200)).body as Array<{
                actionType: string
                actionDetails: { rating?: number }
            }>
        const rate = (review: number) =>
            request(app.getHttpServer()).post('/collection/users/1/reviews/3').set(as('user_ana')).send({ review }).expect(201)

        it('logs a new rating and a changed rating, but not the same rating saved again', async () => {
            await rate(8)
            await rate(8)
            await rate(8)
            await rate(4)

            const ratings = (await activityOf())
                .filter(activity => activity.actionType === 'rated')
                .map(activity => activity.actionDetails.rating)

            expect(ratings).toEqual([8, 4])
        })

        it('keeps the latest rating when it is saved again', async () => {
            await rate(4)

            const reviews = (await request(app.getHttpServer()).get('/collection/users/1/reviews').set(as('user_ana')).expect(200))
                .body as Array<{
                gameId: number
                review: number
            }>

            expect(reviews.find(review => review.gameId === 3)?.review).toBe(4)
        })
    })

    describe('title search', () => {
        const browse = async (search: string) =>
            (
                await request(app.getHttpServer())
                    .get(`/collection/users/1/browse/games?search=${encodeURIComponent(search)}`)
                    .set(as('user_ana'))
                    .expect(200)
            ).body.games.map((game: { titleTranslations: { en: string } }) => game.titleTranslations.en)
        const adminSearch = async (search: string) =>
            (
                await request(app.getHttpServer())
                    .get(`/admin/games?search=${encodeURIComponent(search)}`)
                    .set(as('user_cleo'))
                    .expect(200)
            ).body.pagination.totalItems
        const catalog = async (search: string) =>
            (
                await request(app.getHttpServer())
                    .get(`/groups/10/people/catalog?search=${encodeURIComponent(search)}`)
                    .set(as('user_ana'))
                    .expect(200)
            ).body.map((game: { id: number }) => game.id)

        it('reads an underscore as an underscore, not as any character', async () => {
            expect(await browse('__')).toEqual([])
            expect(await browse('n_e')).toEqual([])
            expect(await browse('r_s')).toEqual(['Under_Score'])
            expect(await catalog('n_e')).toEqual([])
            expect(await catalog('r_s')).toEqual([2])
            expect(await adminSearch('n_e')).toBe(0)
            expect(await adminSearch('r_s')).toBe(1)
        })

        it('finds nothing for punctuation alone instead of listing the whole catalogue', async () => {
            expect(await browse('%%')).toEqual([])
            expect(await adminSearch('%%%')).toBe(0)
        })

        it('still lists everything with no search, and finds plain titles', async () => {
            expect(await browse('')).toEqual(['Azul', 'Catan', 'Under_Score'])
            expect(await browse('az')).toEqual(['Azul'])
            expect(await adminSearch('cat')).toBe(1)
        })
    })
})
