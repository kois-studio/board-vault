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

const run = (command, args, env = {}, input = '') => new Promise((resolvePromise, reject) => {
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
    child.stdin.end(input)
})

try {
    const sqlite = await run('sqlite3', [databasePath], {}, `${schema}\nPRAGMA integrity_check;\n`)
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

    const structure = await run(
        'sqlite3',
        [databasePath],
        {},
        `
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'GroupGameInterest')
                THEN 'group-interest: ok' ELSE 'group-interest: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'GroupAcquisitionDecision')
                THEN 'group-decision: ok' ELSE 'group-decision: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'GroupPerson')
                THEN 'group-person: ok' ELSE 'group-person: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'GroupPersonGameOwnership')
                THEN 'group-person-ownership: ok' ELSE 'group-person-ownership: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'GroupPersonGamePreference')
                THEN 'group-person-preference: ok' ELSE 'group-person-preference: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM pragma_table_info('Meet') WHERE name = 'notes')
                THEN 'meet-notes: ok' ELSE 'meet-notes: missing' END;
            SELECT CASE WHEN (SELECT COUNT(*) FROM SchemaMigrations) = 15
                AND (SELECT MAX(version) FROM SchemaMigrations) = '0015'
                THEN 'migration-state: ok' ELSE 'migration-state: invalid' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM pragma_table_info('GroupPerson') WHERE name = 'claimEmail')
                THEN 'group-person-claim-email: ok' ELSE 'group-person-claim-email: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM pragma_table_info('GroupPerson') WHERE name = 'claimExpiresAt')
                THEN 'group-person-claim-expiry: ok' ELSE 'group-person-claim-expiry: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'MeetPersonAttendee')
                THEN 'meet-person-attendee: ok' ELSE 'meet-person-attendee: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'MeetPersonGame')
                THEN 'meet-person-game: ok' ELSE 'meet-person-game: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'RecommendationFeedbackParticipant')
                THEN 'participant-feedback: ok' ELSE 'participant-feedback: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM pragma_table_info('Invitation') WHERE name = 'expiresAt')
                THEN 'invitation-expiry: ok' ELSE 'invitation-expiry: missing' END;
            SELECT CASE WHEN EXISTS (SELECT 1 FROM pragma_table_info('Invitation') WHERE name = 'groupPersonId')
                THEN 'invitation-group-person: ok' ELSE 'invitation-group-person: missing' END;
            SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM pragma_table_info('Account') WHERE name IN ('password', 'email_verified', 'verification_token', 'verification_token_expires_at', 'password_reset_token', 'password_reset_token_expires_at'))
                THEN 'legacy-credentials-dropped: ok' ELSE 'legacy-credentials-dropped: present' END;
        `,
    )
    if (structure.code !== 0 || !structure.stdout.includes('group-interest: ok') || !structure.stdout.includes('group-decision: ok') || !structure.stdout.includes('group-person: ok') || !structure.stdout.includes('group-person-ownership: ok') || !structure.stdout.includes('group-person-preference: ok') || !structure.stdout.includes('meet-notes: ok') || !structure.stdout.includes('migration-state: ok') || !structure.stdout.includes('meet-person-attendee: ok') || !structure.stdout.includes('meet-person-game: ok') || !structure.stdout.includes('participant-feedback: ok') || !structure.stdout.includes('group-person-claim-email: ok') || !structure.stdout.includes('group-person-claim-expiry: ok') || !structure.stdout.includes('invitation-expiry: ok') || !structure.stdout.includes('invitation-group-person: ok') || !structure.stdout.includes('legacy-credentials-dropped: ok')) {
        throw new Error(`Migrated schema assertions failed.\n${structure.stdout}\n${structure.stderr}`)
    }

    console.log(`Empty-state schema integrity: ${sqlite.stdout.trim()}`)
    process.stdout.write(migration.stdout)
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
