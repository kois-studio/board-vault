// Copies every game's external artwork into Board Vault (#98, ADR-0015): download, compress to WebP,
// store in GameArtwork, and point Game.imageUrl at /artwork/<gameId>-<hash>.webp. Games already
// served from /artwork/ or without artwork are left alone, so running it twice is harmless.
//
// It uses the built backend, so build first (npm --prefix backend run build). Then:
//
//   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… node backend/scripts/import-artwork.mjs [--manifest file.json] [--dry-run]
//
// The manifest replaces a game's source, by game id. Keep it outside the repository:
//
//   { "24": { "source": "https://publisher.example/box.jpg" },        download from here instead
//     "2":  { "source": "https://…/2.png", "file": "/tmp/2.jpg" },    use these bytes, record this source
//     "25": { "source": null } }                                      no artwork for now
//
// Production is an owner step: back up first (operations runbook, section 4).
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'

import { createClient } from '@libsql/client'

const { ArtworkError, downloadArtwork, processArtwork } = await import('../dist/common/artwork/artwork.js')
const { gameArtworkStatements } = await import('../dist/modules/common/database/queries/artwork.queries.js')

const { values } = parseArgs({ options: { manifest: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } })
const dryRun = values['dry-run']
const manifest = values.manifest ? JSON.parse(await readFile(values.manifest, 'utf8')) : {}

const url = process.env.TURSO_DATABASE_URL
if (!url) {
    console.error('Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN for Turso).')
    process.exit(1)
}

const client = createClient({ url, ...(url.startsWith('file:') ? {} : { authToken: process.env.TURSO_AUTH_TOKEN }) })
const games = await client.execute(`
    SELECT g.id, g.imageUrl, COALESCE(en.title, '') AS title
    FROM Game g
    LEFT JOIN GameTranslation en ON en.gameId = g.id AND en.languageCode = 'en'
    WHERE g.imageUrl <> '' AND g.imageUrl NOT LIKE '/artwork/%'
    ORDER BY g.id
`)

const report = { copied: [], removed: [], failed: [] }

for (const game of games.rows) {
    const gameId = Number(game.id)
    const label = `${gameId} ${game.title || '(no title)'}`
    const entry = manifest[String(gameId)]
    const source = entry && 'source' in entry ? entry.source : String(game.imageUrl)

    try {
        if (source === null) {
            if (!dryRun) await client.batch(gameArtworkStatements(gameId, null), 'write')
            report.removed.push(label)
            continue
        }

        const bytes = entry?.file ? await readFile(entry.file) : await downloadArtwork(source)
        const artwork = await processArtwork(bytes)

        if (!dryRun) await client.batch(gameArtworkStatements(gameId, { ...artwork, sourceUrl: source }), 'write')
        report.copied.push(`${label}: ${artwork.width}×${artwork.height}, ${Math.round(artwork.bytes.length / 1024)} KB`)
    } catch (error) {
        report.failed.push(`${label}: ${error instanceof ArtworkError ? error.message : String(error)}`)
    }
}

client.close()

for (const [heading, lines] of Object.entries(report)) {
    console.log(`\n${heading} (${lines.length})${dryRun ? ' [dry run, nothing saved]' : ''}`)
    for (const line of lines) console.log(`  ${line}`)
}

process.exit(report.failed.length > 0 ? 1 : 0)
