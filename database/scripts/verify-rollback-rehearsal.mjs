#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '../..'))
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'board-vault-rollback-'))
const sourcePath = join(temporaryDirectory, 'source.db')
const backupPath = join(temporaryDirectory, 'pre-migration-backup.db')
const recoveryPath = join(temporaryDirectory, 'recovered.db')
const schema = await readFile(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

const run = (command, args, env = {}, input = '') =>
    new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, {
            cwd: repositoryRoot,
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', chunk => {
            stdout += chunk
        })
        child.stderr.on('data', chunk => {
            stderr += chunk
        })
        child.on('error', reject)
        child.on('close', code => resolvePromise({ code, stdout, stderr }))
        child.stdin.end(input)
    })

const fixture = `
PRAGMA foreign_keys = ON;
INSERT INTO Account (id, email, username, password, displayName, email_verified)
VALUES (1, 'organizer@example.test', 'organizer', 'fixture-password', 'Organizer', 1),
       (2, 'member@example.test', 'member', 'fixture-password', 'Member', 1);
INSERT INTO SchemaMigrations (version, name) VALUES
    ('0001', '0001-add-clerk-user-id.sql'),
    ('0002', '0002-add-auth-token-expiry.sql'),
    ('0003', '0003-add-session-relations.sql'),
    ('0004', '0004-add-session-lifecycle.sql'),
    ('0005', '0005-add-recommendation-feedback.sql');
`

const inspect = async (databasePath) =>
    run(
        'sqlite3',
        [databasePath],
        {},
        `
            PRAGMA foreign_keys = ON;
            PRAGMA integrity_check;
            PRAGMA foreign_key_check;
            SELECT (SELECT COUNT(*) FROM Account) || '|' ||
                   (SELECT COUNT(*) FROM SchemaMigrations) || '|' ||
                   (SELECT MAX(version) FROM SchemaMigrations);
        `,
    )

try {
    const source = await run('sqlite3', [sourcePath], {}, `${schema}\n${fixture}\n`)
    if (source.code !== 0) throw new Error(`Could not create the baseline database.\n${source.stderr}`)

    const backup = await run('sqlite3', [sourcePath], {}, `.backup '${backupPath}'\n`)
    if (backup.code !== 0) throw new Error(`Could not create the pre-migration backup.\n${backup.stderr}`)

    const migration = await run('node', [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
        TURSO_DATABASE_URL: `file:${sourcePath}`,
        TURSO_AUTH_TOKEN: '',
    })
    if (migration.code !== 0) throw new Error(`Migration rehearsal failed.\n${migration.stderr}`)

    const recovery = await run('sqlite3', [backupPath], {}, `.backup '${recoveryPath}'\n`)
    if (recovery.code !== 0) throw new Error(`Could not restore the pre-migration backup.\n${recovery.stderr}`)

    const baseline = await inspect(recoveryPath)
    const baselineLines = baseline.stdout.trim().split('\n').map(line => line.trim()).filter(Boolean)
    if (baseline.code !== 0 || baselineLines.join('\n') !== 'ok\n2|5|0005') {
        throw new Error(`Rollback restore assertions failed. Received:\n${baseline.stdout}\n${baseline.stderr}`)
    }

    const reapply = await run('node', [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
        TURSO_DATABASE_URL: `file:${recoveryPath}`,
        TURSO_AUTH_TOKEN: '',
    })
    if (reapply.code !== 0) throw new Error(`Recovered database could not reapply migrations.\n${reapply.stderr}`)

    const recovered = await inspect(recoveryPath)
    const recoveredLines = recovered.stdout.trim().split('\n').map(line => line.trim()).filter(Boolean)
    if (recovered.code !== 0 || recoveredLines.join('\n') !== 'ok\n2|14|0014') {
        throw new Error(`Recovered migration assertions failed. Received:\n${recovered.stdout}\n${recovered.stderr}`)
    }

    console.log('Synthetic SQLite rollback/recovery rehearsal: ok')
    console.log('A pre-migration backup restored cleanly, preserved fixture data, and accepted the full migration sequence again.')
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
