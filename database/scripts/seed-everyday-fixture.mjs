#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const path = resolve(root, 'data/board-vault.local.db')
if (!existsSync(path)) throw new Error('Run npm run local:setup first.')
const require = createRequire(resolve(root, 'backend/package.json'))
const { createClient } = require('@libsql/client')
// This script deliberately ignores remote database environment variables.
const database = createClient({ url: `file:${path}` })
const transaction = await database.transaction('write')
try {
    const accounts = await transaction.execute("SELECT id, email FROM Account WHERE email IN ('organizer+clerk_test@example.com', 'member+clerk_test@example.com')")
    if (accounts.rows.length !== 2) throw new Error('The local synthetic accounts are missing. Run npm run local:setup.')
    const owner = Number(accounts.rows.find(row => row.email === 'organizer+clerk_test@example.com')?.id)
    let group = await transaction.execute({ sql: 'SELECT id FROM UserGroup WHERE name = ? AND createdBy = ?', args: ['Everyday fixture', owner] })
    if (!group.rows.length) group = await transaction.execute({ sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?) RETURNING id', args: ['Everyday fixture', owner] })
    const groupId = Number(group.rows[0].id)
    for (const account of accounts.rows) {
        await transaction.execute({ sql: 'INSERT OR IGNORE INTO GroupMembership (groupId, accountId) VALUES (?, ?)', args: [groupId, account.id] })
        await transaction.execute({ sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) SELECT ?, ?, 'linked', 'active', ?, ? WHERE NOT EXISTS (SELECT 1 FROM GroupPerson WHERE groupId = ? AND accountId = ?)", args: [groupId, account.id, account.id === owner ? 'Fixture organizer' : 'Fixture member', owner, groupId, account.id] })
    }
    await transaction.execute({ sql: "INSERT INTO GroupPerson (groupId, kind, status, displayName, createdByAccountId) SELECT ?, 'placeholder', 'active', 'Fixture guest', ? WHERE NOT EXISTS (SELECT 1 FROM GroupPerson WHERE groupId = ? AND displayName = 'Fixture guest')", args: [groupId, owner, groupId] })
    const existing = await transaction.execute("SELECT gameId FROM GameEdition WHERE languageCode = 'en' AND normalizedTitle = 'borrowed-fixture'")
    if (!existing.rows.length) {
        const game = await transaction.execute("INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES ('', 15, 1, 8)")
        await transaction.execute({ sql: "INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, 'en', 'Borrowed Fixture', 'borrowed-fixture')", args: [Number(game.lastInsertRowid)] })
        await transaction.execute({ sql: "INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (?, 'en', 'Borrowed Fixture', 'borrowed-fixture', 1)", args: [Number(game.lastInsertRowid)] })
    }
    await transaction.commit()
    console.log(JSON.stringify({ groupId, groupName: 'Everyday fixture', gameTitle: 'Borrowed Fixture' }))
} catch (error) { await transaction.rollback(); throw error }
finally { transaction.close(); database.close() }
