#!/usr/bin/env node

import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const requireFromBackend = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'))
const { createClient } = requireFromBackend('@libsql/client')

const databaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
const ownerAccountId = Number(process.env.FIXTURE_OWNER_ACCOUNT_ID)
const memberAccountId = Number(process.env.FIXTURE_MEMBER_ACCOUNT_ID)
const gameId = Number(process.env.FIXTURE_GAME_ID ?? 1)
const groupName = process.env.FIXTURE_GROUP_NAME ?? `Board Vault rehearsal ${new Date().toISOString().slice(0, 10)}`
const sessionDate = process.env.FIXTURE_SESSION_DATE ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const timezone = process.env.FIXTURE_TIMEZONE ?? 'UTC'

if (!databaseUrl) {
    throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is required.')
}

if (!Number.isInteger(ownerAccountId) || ownerAccountId < 1 || !Number.isInteger(memberAccountId) || memberAccountId < 1) {
    throw new Error('FIXTURE_OWNER_ACCOUNT_ID and FIXTURE_MEMBER_ACCOUNT_ID must be positive integers.')
}

if (ownerAccountId === memberAccountId) {
    throw new Error('Fixture owner and member accounts must be different accounts.')
}

if (!Number.isInteger(gameId) || gameId < 1) {
    throw new Error('FIXTURE_GAME_ID must be a positive integer.')
}

if (groupName.length === 0 || groupName.length > 100) {
    throw new Error('FIXTURE_GROUP_NAME must contain between 1 and 100 characters.')
}

const client = createClient({
    url: databaseUrl,
    ...(authToken ? { authToken } : {}),
})

const accountResult = await client.execute({
    sql: `
        SELECT id, username
        FROM Account
        WHERE id IN (?, ?) AND isDeleted = FALSE
        ORDER BY id
    `,
    args: [ownerAccountId, memberAccountId],
})

if (accountResult.rows.length !== 2) {
    throw new Error('Both fixture accounts must exist and be active in the target database.')
}

const gameResult = await client.execute({
    sql: `
        SELECT g.id, COALESCE(gt_en.title, gt_es.title) AS title
        FROM Game g
        LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
        LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
        WHERE g.id = ?
    `,
    args: [gameId],
})

if (gameResult.rows.length !== 1) {
    throw new Error(`Fixture game ${gameId} does not exist in the target database.`)
}

const migrationResult = await client.execute("SELECT MAX(version) AS version FROM SchemaMigrations")
if (String(migrationResult.rows[0]?.version ?? '') !== '0021') {
    throw new Error('The target database must be migrated through 0021 before seeding the social fixture.')
}

let transaction
try {
    transaction = await client.transaction('write')

    const groupResult = await transaction.execute({
        sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
        args: [groupName, ownerAccountId],
    })
    const fixtureGroupId = Number(groupResult.lastInsertRowid)

    await transaction.batch(
        [
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)', args: [ownerAccountId, fixtureGroupId] },
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)', args: [memberAccountId, fixtureGroupId] },
            { sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [ownerAccountId, gameId] },
            { sql: 'INSERT OR IGNORE INTO OwnedGame (accountId, gameId) VALUES (?, ?)', args: [memberAccountId, gameId] },
            { sql: 'INSERT OR REPLACE INTO GameReview (accountId, gameId, review) VALUES (?, ?, ?)', args: [ownerAccountId, gameId, 9] },
        ],
        'write',
    )

    const meetResult = await transaction.execute({
        sql: `
            INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes)
            VALUES (?, ?, ?, TRUE, 'scheduled', ?, ?)
        `,
        args: [fixtureGroupId, ownerAccountId, sessionDate, timezone, 'Seeded social-loop rehearsal'],
    })
    const fixtureSessionId = Number(meetResult.lastInsertRowid)

    await transaction.batch(
        [
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, \'accepted\', \'unknown\')', args: [fixtureSessionId, ownerAccountId] },
            { sql: 'INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, \'pending\', \'unknown\')', args: [fixtureSessionId, memberAccountId] },
            { sql: 'INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES (?, ?, \'planned\', 1)', args: [fixtureSessionId, gameId] },
        ],
        'write',
    )

    await transaction.commit()

    console.log(JSON.stringify({
        groupId: fixtureGroupId,
        sessionId: fixtureSessionId,
        gameId,
        gameTitle: String(gameResult.rows[0]?.title ?? `Game ${gameId}`),
        ownerAccountId,
        memberAccountId,
        groupName,
    }, null, 2))
} catch (error) {
    await transaction?.rollback().catch(() => undefined)
    throw error
} finally {
    client.close()
}
