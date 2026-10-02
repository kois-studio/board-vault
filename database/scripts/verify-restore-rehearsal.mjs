#!/usr/bin/env node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(join(fileURLToPath(new URL('.', import.meta.url)), '../..'))
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'board-vault-restore-'))
const sourcePath = join(temporaryDirectory, 'source.db')
const restoredPath = join(temporaryDirectory, 'restored.db')
const schema = await readFile(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

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

const fixture = `
PRAGMA foreign_keys = ON;
INSERT INTO Account (id, email, username, password, displayName, email_verified)
VALUES
    (1, 'organizer@example.test', 'organizer', 'fixture-password', 'Organizer', 1),
    (2, 'member@example.test', 'member', 'fixture-password', 'Member', 1);
INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
VALUES (10, 'https://example.test/game.png', 90, 2, 4);
INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle)
VALUES (10, 'en', 'Fixture Game', 'fixture game'), (10, 'es', 'Juego de prueba', 'juego de prueba');
INSERT INTO UserGroup (id, name, createdBy) VALUES (20, 'Fixture Group', 1);
INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 20), (2, 20);
INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 10), (2, 10);
INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
VALUES (30, 20, 1, '2026-01-10 19:00:00', 1, 'completed', 'Europe/Madrid');
INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
VALUES (30, 1, 'accepted', 'attended'), (30, 2, 'accepted', 'attended');
INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES (30, 10, 'played', 1);
INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (30, 1, 10), (30, 2, 10);
INSERT INTO Invitation (id, groupId, fromAccountId, toAccountId, sentAt)
VALUES (40, 20, 1, 2, '2026-01-01 10:00:00');
`

try {
    const source = await run('sqlite3', [sourcePath], {}, `${schema}\n${fixture}\nPRAGMA integrity_check;\n`)
    if (source.code !== 0 || !source.stdout.trim().endsWith('ok')) {
        throw new Error(`Could not create an integrity-checked synthetic source database.\n${source.stderr}\n${source.stdout}`)
    }

    const backup = await run('sqlite3', [sourcePath], {}, `.backup '${restoredPath}'\n`)
    if (backup.code !== 0) {
        throw new Error(`SQLite backup rehearsal failed.\n${backup.stderr}`)
    }

    const migration = await run('node', [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
        TURSO_DATABASE_URL: `file:${restoredPath}`,
        TURSO_AUTH_TOKEN: '',
        MIGRATION_BASELINE: '0005',
    })
    if (migration.code !== 0) {
        throw new Error(`Restored database migration rehearsal failed.\n${migration.stderr}`)
    }

    const restored = await run(
        'sqlite3',
        [restoredPath],
        {},
        `
            PRAGMA foreign_keys = ON;
            PRAGMA integrity_check;
            PRAGMA foreign_key_check;
            SELECT (SELECT COUNT(*) FROM Account) || '|' ||
                   (SELECT COUNT(*) FROM GroupMembership) || '|' ||
                   (SELECT COUNT(*) FROM MeetAttendee) || '|' ||
                   (SELECT COUNT(*) FROM MeetGame) || '|' ||
                   (SELECT COUNT(*) FROM MeetAccountGame);
            SELECT (SELECT name FROM UserGroup WHERE id = 20) || '|' ||
                   (SELECT title FROM GameTranslation WHERE gameId = 10 AND languageCode = 'en') || '|' ||
                   (SELECT expiresAt FROM Invitation WHERE id = 40);
            SELECT CASE WHEN (SELECT notes FROM Meet WHERE id = 30) IS NULL THEN 'notes:ok' ELSE 'notes:unexpected' END;
            SELECT (SELECT COUNT(*) FROM SchemaMigrations) || '|' || (SELECT MAX(version) FROM SchemaMigrations);
            SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM pragma_table_info('Account') WHERE name IN ('password', 'email_verified'))
                THEN 'credentials:dropped' ELSE 'credentials:present' END;
        `,
    )
    if (restored.code !== 0) {
        throw new Error(`Could not inspect the restored database.\n${restored.stderr}`)
    }

    const lines = restored.stdout.trim().split('\n').map(line => line.trim()).filter(Boolean)
    const expected = ['ok', '2|2|2|1|2', 'Fixture Group|Fixture Game|2026-01-31 10:00:00', 'notes:ok', '16|0016', 'credentials:dropped']
    if (lines.join('\n') !== expected.join('\n')) {
        throw new Error(`Restored database assertions failed. Expected:\n${expected.join('\n')}\nReceived:\n${lines.join('\n')}`)
    }

    console.log('Synthetic SQLite backup/restore rehearsal: ok')
    console.log('Representative accounts, group membership, session attendance, played games, translations, and invitation history survived the copy.')
    console.log('Pending migrations 0006–0016 applied successfully to the restored database; integrity and foreign-key checks passed.')
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
}
