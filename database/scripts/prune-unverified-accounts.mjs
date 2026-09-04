#!/usr/bin/env node

import { resolve } from 'node:path'
import { createRequire } from 'node:module'

const requireFromBackend = createRequire(resolve(process.cwd(), 'backend/package.json'))
const { createClient } = requireFromBackend('@libsql/client')

const databaseUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
const retentionDays = Number.parseInt(process.env.UNVERIFIED_ACCOUNT_RETENTION_DAYS ?? '60', 10)
const applyChanges = process.argv.includes('--apply')

if (!databaseUrl) {
    throw new Error('TURSO_DATABASE_URL (or DATABASE_URL) is required.')
}

if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('UNVERIFIED_ACCOUNT_RETENTION_DAYS must be a positive integer.')
}

const client = createClient({
    url: databaseUrl,
    ...(authToken ? { authToken } : {}),
})

const inactiveAccountsQuery = `
    SELECT a.id, a.created_at
    FROM Account a
    WHERE a.isDeleted = 0
      AND a.email_verified = 0
      AND a.clerkUserId IS NULL
      AND a.created_at < datetime('now', ?)
      AND NOT EXISTS (SELECT 1 FROM CollectionActivity WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM GameProposal WHERE submittedBy = a.id)
      AND NOT EXISTS (SELECT 1 FROM GameReview WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM GroupMembership WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM Invitation WHERE fromAccountId = a.id OR toAccountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM Meet WHERE createdBy = a.id)
      AND NOT EXISTS (SELECT 1 FROM MeetAttendee WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM MeetAccountGame WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM Notification WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM OwnedGame WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM RecommendationFeedback WHERE accountId = a.id)
      AND NOT EXISTS (SELECT 1 FROM UserGroup WHERE createdBy = a.id)
      AND NOT EXISTS (SELECT 1 FROM WishlistedGame WHERE accountId = a.id)
    ORDER BY a.id
`

const result = await client.execute({
    sql: inactiveAccountsQuery,
    args: [`-${retentionDays} days`],
})
const accountIds = result.rows.map(row => Number(row[0]))

if (accountIds.length === 0) {
    console.log(`No unverified inactive accounts older than ${retentionDays} days.`)
    client.close()
    process.exit(0)
}

if (!applyChanges) {
    console.log(`Dry run: ${accountIds.length} account(s) match the ${retentionDays}-day retention policy.`)
    console.log(`Candidate account IDs: ${accountIds.join(', ')}`)
    console.log('No data changed. Re-run with --apply to soft-delete these accounts.')
    client.close()
    process.exit(0)
}

await client.execute({
    sql: `
        UPDATE Account
        SET isDeleted = 1,
            verification_token = NULL,
            password_reset_token = NULL,
            verification_token_expires_at = NULL,
            password_reset_token_expires_at = NULL
        WHERE id IN (${accountIds.map(() => '?').join(', ')})
    `,
    args: accountIds,
})

console.log(`Soft-deleted ${accountIds.length} unverified inactive account(s).`)
console.log(`Account IDs: ${accountIds.join(', ')}`)
client.close()
