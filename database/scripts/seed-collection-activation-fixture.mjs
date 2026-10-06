#!/usr/bin/env node

import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireFromBackend = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'))
const { createClient } = requireFromBackend('@libsql/client')

const databaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
const accountId = Number(process.env.FIXTURE_COLLECTION_ACCOUNT_ID)

if (!databaseUrl?.startsWith('file:')) {
    throw new Error('This fixture is local-only. Set TURSO_DATABASE_URL to a file: SQLite URL.')
}

if (!Number.isInteger(accountId) || accountId < 1) {
    throw new Error('FIXTURE_COLLECTION_ACCOUNT_ID must be a positive integer.')
}

const games = [
    { id: 9001, title: 'Board Vault Activation One', duration: 45, minPlayers: 2, maxPlayers: 4 },
    { id: 9002, title: 'Board Vault Activation Two', duration: 60, minPlayers: 2, maxPlayers: 5 },
    { id: 9003, title: 'Board Vault Activation Three', duration: 30, minPlayers: 1, maxPlayers: 4 },
    { id: 9004, title: 'Board Vault Activation Four', duration: 90, minPlayers: 3, maxPlayers: 6 },
    { id: 9005, title: 'Board Vault Activation Five', duration: 75, minPlayers: 2, maxPlayers: 6 },
]

const client = createClient({ url: databaseUrl })
let transaction

try {
    const account = await client.execute({
        sql: 'SELECT id FROM Account WHERE id = ? AND isDeleted = FALSE',
        args: [accountId],
    })
    if (account.rows.length !== 1) {
        throw new Error(`Collection fixture account ${accountId} does not exist or is deleted.`)
    }

    const migration = await client.execute('SELECT MAX(version) AS version FROM SchemaMigrations')
    if (String(migration.rows[0]?.version ?? '') !== '0018') {
        throw new Error('The target database must be migrated through 0018 before seeding the collection fixture.')
    }

    transaction = await client.transaction('write')
    await transaction.batch(
        games.flatMap((game) => [
            {
                sql: 'INSERT OR IGNORE INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?, ?)',
                args: [game.id, `https://images.example.test/activation-${game.id}.jpg`, game.duration, game.minPlayers, game.maxPlayers],
            },
            {
                sql: 'INSERT OR IGNORE INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, \'en\', ?, ?)',
                args: [game.id, game.title, game.title.toLowerCase().replace(/\s+/g, '-')],
            },
        ]),
        'write',
    )
    await transaction.commit()

    console.log(
        JSON.stringify(
            {
                accountId,
                games: games.map(({ title }) => title),
                searchTerms: games.map(({ title }) => title),
            },
            null,
            2,
        ),
    )
} catch (error) {
    await transaction?.rollback().catch(() => undefined)
    throw error
} finally {
    client.close()
}
