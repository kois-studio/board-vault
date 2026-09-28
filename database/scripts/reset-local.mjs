#!/usr/bin/env node

import { createRequire } from 'node:module'
import { chmod, mkdir, readFile, readdir, rm, lstat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '../..')
const dataDirectory = resolve(repositoryRoot, 'data')
const databasePath = resolve(dataDirectory, 'board-vault.local.db')
const schemaPath = resolve(repositoryRoot, 'database/schema/schema.sql')
const migrationsDirectory = resolve(repositoryRoot, 'database/migrations')
const requireFromBackend = createRequire(resolve(repositoryRoot, 'backend/package.json'))
const { createClient } = requireFromBackend('@libsql/client')
const bcrypt = requireFromBackend('bcryptjs')

const localDatabaseUrl = `file:${databasePath}`
const localPassword = 'local-only-board-vault'
process.umask(0o077)

function runNodeScript(scriptPath, env) {
    return new Promise((resolvePromise, reject) => {
        const child = spawn(process.execPath, [scriptPath], {
            cwd: repositoryRoot,
            env: { ...process.env, ...env },
            stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stdout = ''
        let stderr = ''
        child.stdout.on('data', chunk => { stdout += chunk })
        child.stderr.on('data', chunk => { stderr += chunk })
        child.on('error', reject)
        child.on('close', code => resolvePromise({ code, stdout, stderr }))
    })
}

async function clearLocalDatabaseFiles() {
    try {
        const directoryInfo = await lstat(dataDirectory)
        if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
            throw new Error(`Refusing to reset an unexpected data directory at ${dataDirectory}`)
        }
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error
        await mkdir(dataDirectory, { recursive: true, mode: 0o700 })
    }
    await chmod(dataDirectory, 0o700)
    try {
        const info = await lstat(databasePath)
        if (info.isSymbolicLink() || !info.isFile()) {
            throw new Error(`Refusing to reset an unexpected file at ${databasePath}`)
        }
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error
    }

    await Promise.all([
        rm(databasePath, { force: true }),
        rm(`${databasePath}-shm`, { force: true }),
        rm(`${databasePath}-wal`, { force: true }),
    ])
}

async function createBaselineDatabase() {
    const schema = await readFile(schemaPath, 'utf8')
    const migrations = (await readdir(migrationsDirectory))
        .filter(name => /^\d{4}-[a-z0-9-]+\.sql$/.test(name))
        .sort()
    const baselineMigrations = migrations.filter(name => name.slice(0, 4) <= '0005')

    if (baselineMigrations.length !== 5 || baselineMigrations.at(-1)?.slice(0, 4) !== '0005') {
        throw new Error('The local schema bootstrap expects the reviewed 0001–0005 schema baseline.')
    }

    const client = createClient({ url: localDatabaseUrl })
    try {
        await client.executeMultiple(schema)
        await client.batch(baselineMigrations.map(name => ({
            sql: 'INSERT INTO SchemaMigrations (version, name) VALUES (?, ?)',
            args: [name.slice(0, 4), name],
        })), 'write')
    } finally {
        client.close()
    }
}

async function seedLocalScenario() {
    const client = createClient({ url: localDatabaseUrl })
    let transaction
    try {
        await client.execute('PRAGMA foreign_keys = ON')
        const migration = await client.execute('SELECT MAX(version) AS version FROM SchemaMigrations')
        if (String(migration.rows[0]?.version ?? '') !== '0014') {
            throw new Error('Local fixtures can only be added after migrations reach 0014.')
        }

        const passwordHash = await bcrypt.hash(localPassword, 10)
        transaction = await client.transaction('write')

        const accounts = {}
        for (const [key, email, username, displayName] of [
            ['organizer', 'organizer@example.test', 'organizer', 'Organizer'],
            ['member', 'member@example.test', 'member', 'Member'],
        ]) {
            const result = await transaction.execute({
                sql: `INSERT INTO Account
                    (email, username, password, displayName, avatar, isDeleted, isAdmin, email_verified)
                    VALUES (?, ?, ?, ?, ?, FALSE, FALSE, TRUE)`,
                args: [
                    email,
                    username,
                    passwordHash,
                    displayName,
                    JSON.stringify({ backgroundColor: '#4f46e5', iconName: 'person-fill', emoji: null, type: 'initials', initials: username.slice(0, 2) }),
                ],
            })
            accounts[key] = Number(result.lastInsertRowid)
        }

        const games = {}
        const fixtureGames = [
            ['root', 'Root', 'Root', 90, 2, 4],
            ['cascadia', 'Cascadia', 'Cascadia', 45, 1, 4],
            ['wingspan', 'Wingspan', 'Wingspan', 70, 1, 5],
            ['azul', 'Azul', 'Azul', 40, 2, 4],
            ['brass-birmingham', 'Brass: Birmingham', 'Brass: Birmingham', 120, 2, 4],
        ]
        for (const [key, titleEn, titleEs, duration, minPlayers, maxPlayers] of fixtureGames) {
            const result = await transaction.execute({
                sql: 'INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?)',
                args: [`https://images.example.test/${key}.jpg`, duration, minPlayers, maxPlayers],
            })
            const gameId = Number(result.lastInsertRowid)
            games[key] = gameId
            for (const [languageCode, title] of [['en', titleEn], ['es', titleEs]]) {
                await transaction.execute({
                    sql: 'INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
                    args: [gameId, languageCode, title, title.toLowerCase()],
                })
            }
        }

        const group = await transaction.execute({
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: ['Friday Game Night (local fixture)', accounts.organizer],
        })
        const groupId = Number(group.lastInsertRowid)

        await transaction.batch([
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)', args: [accounts.organizer, groupId] },
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)', args: [accounts.member, groupId] },
            { sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [accounts.organizer, games.root] },
            { sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [accounts.organizer, games.cascadia] },
            { sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [accounts.member, games.cascadia] },
            { sql: 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [accounts.member, games.wingspan] },
            { sql: 'INSERT INTO GameReview (accountId, gameId, review, reviewDate) VALUES (?, ?, ?, ?)', args: [accounts.organizer, games.root, 9, '2026-08-20'] },
            { sql: 'INSERT INTO GameReview (accountId, gameId, review, reviewDate) VALUES (?, ?, ?, ?)', args: [accounts.member, games.root, 8, '2026-08-22'] },
            { sql: 'INSERT INTO GameReview (accountId, gameId, review, reviewDate) VALUES (?, ?, ?, ?)', args: [accounts.organizer, games.wingspan, 7, '2026-08-10'] },
        ], 'write')

        const completedSession = await transaction.execute({
            sql: `INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone)
                VALUES (?, ?, ?, TRUE, 'completed', 'Europe/Madrid')`,
            args: [groupId, accounts.organizer, '2026-08-21T19:00:00+02:00'],
        })
        const completedSessionId = Number(completedSession.lastInsertRowid)
        await transaction.batch([
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, ?, ?)', args: [completedSessionId, accounts.organizer, 'accepted', 'attended'] },
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, ?, ?)', args: [completedSessionId, accounts.member, 'accepted', 'attended'] },
            { sql: "INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES (?, ?, 'played', 1)", args: [completedSessionId, games.root] },
            { sql: 'INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (?, ?, ?)', args: [completedSessionId, accounts.organizer, games.root] },
            { sql: 'INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (?, ?, ?)', args: [completedSessionId, accounts.member, games.root] },
        ], 'write')

        const scheduledSession = await transaction.execute({
            sql: `INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone)
                VALUES (?, ?, ?, TRUE, 'scheduled', 'Europe/Madrid')`,
            args: [groupId, accounts.organizer, '2026-10-02T19:00:00+02:00'],
        })
        const scheduledSessionId = Number(scheduledSession.lastInsertRowid)
        await transaction.batch([
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus) VALUES (?, ?, ?)', args: [scheduledSessionId, accounts.organizer, 'accepted'] },
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus) VALUES (?, ?, ?)', args: [scheduledSessionId, accounts.member, 'pending'] },
            { sql: "INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES (?, ?, 'planned', 1)", args: [scheduledSessionId, games.azul] },
            { sql: "INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES (?, ?, 'planned', 2)", args: [scheduledSessionId, games['brass-birmingham']] },
        ], 'write')

        await transaction.commit()
        await chmod(databasePath, 0o600)
        console.log('Local SQLite reset and synthetic scenario seed completed.')
        console.log(`Database: ${databasePath}`)
        console.log('Synthetic login: organizer@example.test / local-only-board-vault')
        console.log('Synthetic login: member@example.test / local-only-board-vault')
        console.log(`Seeded ${Object.keys(games).length} games, one group, reviews, ownership, and completed/scheduled sessions.`)
    } catch (error) {
        await transaction?.rollback().catch(() => undefined)
        throw error
    } finally {
        client.close()
    }
}

await clearLocalDatabaseFiles()
await createBaselineDatabase()

const migration = await runNodeScript(resolve(repositoryRoot, 'database/scripts/migrate.mjs'), {
    TURSO_DATABASE_URL: localDatabaseUrl,
    TURSO_AUTH_TOKEN: '',
})
if (migration.code !== 0) {
    throw new Error(`Local migration failed.\n${migration.stderr}`)
}
process.stdout.write(migration.stdout)

await seedLocalScenario()
