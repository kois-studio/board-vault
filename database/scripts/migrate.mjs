#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const requireFromBackend = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'))
const { createClient } = requireFromBackend('@libsql/client')

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = resolve(process.env.MIGRATIONS_DIR ?? join(scriptDirectory, '../migrations'), '.')
const databaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
const baseline = process.env.MIGRATION_BASELINE

if (!databaseUrl) {
    throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is required.')
}

const migrationFiles = (await readdir(migrationsDirectory))
    .filter(fileName => /^\d{4}-[a-z0-9-]+\.sql$/.test(fileName))
    .sort()
    .map(fileName => ({
        fileName,
        version: fileName.slice(0, 4),
    }))

if (migrationFiles.length === 0) {
    throw new Error(`No numbered migrations found in ${migrationsDirectory}.`)
}

if (baseline && !migrationFiles.some(migration => migration.version === baseline)) {
    throw new Error(`MIGRATION_BASELINE must match an existing migration version: ${migrationFiles.map(migration => migration.version).join(', ')}`)
}

const client = createClient({
    url: databaseUrl,
    ...(authToken ? { authToken } : {}),
})

await client.execute(`
    CREATE TABLE IF NOT EXISTS SchemaMigrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        appliedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`)

const appliedResult = await client.execute('SELECT version FROM SchemaMigrations ORDER BY version')
const appliedVersions = new Set(appliedResult.rows.map(row => String(row[0])))

if (appliedVersions.size === 0 && !baseline) {
    throw new Error(
        'SchemaMigrations is empty. Set MIGRATION_BASELINE to the highest migration already represented by the database snapshot, then run again. No migration was executed.',
    )
}

if (appliedVersions.size === 0 && baseline) {
    const baselineMigrations = migrationFiles.filter(migration => migration.version <= baseline)
    await client.batch(
        baselineMigrations.map(migration => ({
            sql: 'INSERT INTO SchemaMigrations (version, name) VALUES (?, ?)',
            args: [migration.version, migration.fileName],
        })),
        'write',
    )
    for (const migration of baselineMigrations) {
        appliedVersions.add(migration.version)
    }
    console.log(`Recorded baseline ${baseline} (${baselineMigrations.length} migrations).`)
}

for (const migration of migrationFiles) {
    if (appliedVersions.has(migration.version)) {
        continue
    }

    const sql = await readFile(resolve(migrationsDirectory, migration.fileName), 'utf8')
    await client.executeMultiple(`
        BEGIN;
        ${sql}
        INSERT INTO SchemaMigrations (version, name) VALUES ('${migration.version}', '${migration.fileName}');
        COMMIT;
    `)
    appliedVersions.add(migration.version)
    console.log(`Applied ${migration.fileName}.`)
}

console.log(`Migration state is current at ${migrationFiles.at(-1).version}.`)
client.close()
