#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '../..'))
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'board-vault-db-'))
const databasePath = join(temporaryDirectory, 'empty-state.db')
const schemaPath = resolve(repositoryRoot, 'database/schema/schema.sql')
const schema = await readFile(schemaPath, 'utf8')

const run = (command, args, env = {}) => new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
        cwd: repositoryRoot,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolvePromise({ code, stdout, stderr }))
    child.stdin.end(schema)
})

try {
    const sqlite = await run('sqlite3', [databasePath, 'PRAGMA integrity_check;'])
    if (sqlite.code !== 0) {
        throw new Error(`sqlite3 failed. Install sqlite3 to run empty-state verification.\n${sqlite.stderr}`)
    }
    if (sqlite.stdout.trim() !== 'ok') {
        throw new Error(`Schema integrity check failed: ${sqlite.stdout.trim()}`)
    }

    const migration = await run('node', [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
        TURSO_DATABASE_URL: `file:${databasePath}`,
        MIGRATION_BASELINE: '0005',
        TURSO_AUTH_TOKEN: '',
    })
    if (migration.code !== 0) {
        throw new Error(`Migration baseline verification failed.\n${migration.stderr}`)
    }

    console.log(`Empty-state schema integrity: ${sqlite.stdout.trim()}`)
    process.stdout.write(migration.stdout)
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
