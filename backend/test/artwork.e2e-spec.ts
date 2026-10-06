import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import sharp from 'sharp'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { createBodyParsers } from './../src/common/http/http-hardening.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { ArtworkDownloader } from './../src/modules/core/artwork/artwork-downloader.js'
import { FakeArtworkDownloader, pngImage } from './fake-artwork-downloader.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'artwork.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const ARTWORK = /^\/artwork\/(\d+)-([0-9a-f]{16})\.webp$/

describe('game artwork (e2e)', () => {
    let app: INestApplication
    let database: Client
    const downloader = new FakeArtworkDownloader()

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
                    (2, 'player@example.test', 'player', ${avatar}, 'Player', 'user_player', 0, 0);
                -- Azul still links to another site; Catan has no artwork.
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, '', 90, 3, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (2, 'en', 'Catan', 'catan');
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
            .overrideProvider(ArtworkDownloader)
            .useValue(downloader)
            .compile()

        // The production body parsers, so uploads go through the same size limit.
        app = moduleFixture.createNestApplication({ bodyParser: false })
        app.use(...createBodyParsers())
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }
    const asPlayer = { Authorization: `Bearer ${sessionFor('user_player')}` }
    const imageUrlOf = async (gameId: number) =>
        String((await database.execute({ sql: 'SELECT imageUrl FROM Game WHERE id = ?', args: [gameId] })).rows[0]?.imageUrl)

    it('copies an address an admin gives into Board Vault, and serves it from its own path for a year', async () => {
        const saved = await request(app.getHttpServer())
            .patch('/admin/games/2')
            .set(asAdmin)
            .send({ imageUrl: 'https://example.test/catan-box.png' })
            .expect(200)

        expect(saved.body.imageUrl).toMatch(ARTWORK)
        expect(saved.body.artworkSource).toBe('https://example.test/catan-box.png')
        expect(saved.body.issues).not.toContain('no-artwork')

        const served = await request(app.getHttpServer()).get(saved.body.imageUrl).buffer(true).expect(200)

        expect(served.headers['content-type']).toBe('image/webp')
        expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable')
        expect(served.headers['cdn-cache-control']).toBe('public, max-age=31536000, immutable')
        expect((await sharp(served.body as Buffer).metadata()).format).toBe('webp')
    })

    it('keeps the artwork when the form sends back the address it showed, without downloading again', async () => {
        const before = await imageUrlOf(2)
        const downloads = downloader.downloaded.length

        // The app shows the artwork at its full address on the API.
        await request(app.getHttpServer())
            .patch('/admin/games/2')
            .set(asAdmin)
            .send({ imageUrl: `https://backend.example.test${before}`, minPlayers: 2 })
            .expect(200)
        await request(app.getHttpServer()).patch('/admin/games/2').set(asAdmin).send({ imageUrl: before }).expect(200)

        expect(await imageUrlOf(2)).toBe(before)
        expect(downloader.downloaded).toHaveLength(downloads)
    })

    it('gives new artwork a new address, and serves an old address briefly with the current image', async () => {
        const before = await imageUrlOf(2)

        await request(app.getHttpServer())
            .patch('/admin/games/2')
            .set(asAdmin)
            .send({ imageUrl: 'https://example.test/catan-second-edition.png' })
            .expect(200)

        const after = await imageUrlOf(2)
        const old = await request(app.getHttpServer()).get(before).expect(200)

        expect(after).not.toBe(before)
        expect(old.headers['cache-control']).toBe('public, max-age=300')
    })

    it('replaces the artwork with an uploaded photo, for admins only', async () => {
        const photo = await pngImage('#16a34a', 1600)

        await request(app.getHttpServer())
            .put('/admin/games/1/artwork')
            .set({ ...asPlayer, 'Content-Type': 'image/png' })
            .send(photo)
            .expect(403)

        const saved = await request(app.getHttpServer())
            .put('/admin/games/1/artwork')
            .set({ ...asAdmin, 'Content-Type': 'image/png' })
            .send(photo)
            .expect(200)

        expect(saved.body.imageUrl).toMatch(ARTWORK)
        expect(saved.body.artworkSource).toBeNull()

        // Stored no larger than 800 pixels on its longest side.
        const stored = await database.execute({ sql: 'SELECT width, height FROM GameArtwork WHERE gameId = 1', args: [] })

        expect({ ...stored.rows[0] }).toEqual({ width: 800, height: 800 })
    })

    it('refuses an upload that is not an image Board Vault can read', async () => {
        const refused = await request(app.getHttpServer())
            .put('/admin/games/1/artwork')
            .set({ ...asAdmin, 'Content-Type': 'image/png' })
            .send(Buffer.from('not an image'))
            .expect(400)

        expect(refused.body.message).toBe('Artwork: That file is not an image Board Vault can read.')
        await request(app.getHttpServer())
            .put('/admin/games/1/artwork')
            .set({ ...asAdmin, 'Content-Type': 'application/json' })
            .send({ image: 'x' })
            .expect(400)
        await request(app.getHttpServer())
            .put('/admin/games/999/artwork')
            .set({ ...asAdmin, 'Content-Type': 'image/png' })
            .send(await pngImage())
            .expect(404)
    })

    it('says why a dead link cannot become artwork, and keeps the current one', async () => {
        const before = await imageUrlOf(1)
        const refused = await request(app.getHttpServer())
            .patch('/admin/games/1')
            .set(asAdmin)
            .send({ imageUrl: 'https://example.test/missing.png', minPlayers: 1 })
            .expect(400)

        expect(refused.body.message).toBe('Artwork: example.test answered 404.')
        expect(await imageUrlOf(1)).toBe(before)
    })

    it('removes the artwork and its stored copy when the address is cleared', async () => {
        const before = await imageUrlOf(2)

        await request(app.getHttpServer()).patch('/admin/games/2').set(asAdmin).send({ imageUrl: '' }).expect(200)

        const stored = await database.execute({ sql: 'SELECT COUNT(*) AS count FROM GameArtwork WHERE gameId = 2', args: [] })

        expect(await imageUrlOf(2)).toBe('')
        expect(Number(stored.rows[0]?.count)).toBe(0)
        await request(app.getHttpServer()).get(before).expect(404)
    })

    it('answers only artwork file names', async () => {
        await request(app.getHttpServer()).get('/artwork/2-0123456789abcdef.png').expect(400)
        await request(app.getHttpServer()).get('/artwork/..%2F..%2Fetc%2Fpasswd').expect(400)
        await request(app.getHttpServer()).get('/artwork/999-0123456789abcdef.webp').expect(404)
    })
})
