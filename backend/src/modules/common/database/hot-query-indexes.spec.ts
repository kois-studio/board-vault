import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@libsql/client'

import { CollectionQueries } from './queries/collection.queries.js'
import { GameQueries } from './queries/games.queries.js'
import { GroupQueries } from './queries/groups.queries.js'
import { InvitationQueries } from './queries/invitations.queries.js'
import { NotificationQueries } from './queries/notifications.queries.js'
import { SessionQueries } from './queries/sessions.queries.js'

import type { DatabaseService } from './database.service.js'
import type { Client, InStatement } from '@libsql/client'

const DATABASE_DIRECTORY = resolve(__dirname, '../../../../../database')

/** A database built the way every environment is: the baseline schema, then each migration after it in order. */
async function migratedDatabase(): Promise<Client> {
    const client = createClient({ url: ':memory:' })

    await client.executeMultiple(readFileSync(resolve(DATABASE_DIRECTORY, 'schema/schema.sql'), 'utf8'))
    const migrations = readdirSync(resolve(DATABASE_DIRECTORY, 'migrations'))
        .filter(file => /^\d{4}-.+\.sql$/.test(file) && file.slice(0, 4) > '0005')
        .sort()

    for (const file of migrations) {
        await client.executeMultiple(readFileSync(resolve(DATABASE_DIRECTORY, 'migrations', file), 'utf8'))
    }
    return client
}

const asDatabase = (execute: (stmt: InStatement) => Promise<unknown>) => ({ execute }) as unknown as DatabaseService

describe('hot query indexes (#249)', () => {
    let client: Client

    beforeAll(async () => {
        client = await migratedDatabase()
    })

    afterAll(() => client.close())

    /** The plan SQLite picks for the statement a query method sends, read without running it. */
    async function planOf(run: (database: DatabaseService) => Promise<unknown>): Promise<string> {
        const details: Array<string> = []

        await run(
            asDatabase(async stmt => {
                const { sql, args } = typeof stmt === 'string' ? { sql: stmt, args: [] } : stmt
                const plan = await client.execute({ sql: `EXPLAIN QUERY PLAN ${sql}`, args: args ?? [] })

                details.push(...plan.rows.map(row => String(row['detail'])))
                return { rows: [], columns: [], rowsAffected: 0 }
            }),
        )
        return details.join('\n')
    }

    it.each([
        ['the inbox', (db: DatabaseService) => new NotificationQueries(db).getNotificationsByAccountId(1), 'Notification_account_created'],
        ['the members of a group', (db: DatabaseService) => new GroupQueries(db).getGroupMemberIds(1), 'GroupMembership_group'],
        ['the nights of a group', (db: DatabaseService) => new SessionQueries(db).getMeetsByGroupId(1), 'Meet_group_status_date'],
        ['the games with a tag', (db: DatabaseService) => new GameQueries(db).getGameCountByTagId(1), 'GameTag_tag'],
        ['similar games', (db: DatabaseService) => new GameQueries(db).getSimilarGameIds(1, 6), 'GameTag_tag'],
        ['the ratings of a game', (db: DatabaseService) => new CollectionQueries(db).getAvgGlobalRating(1), 'GameReview_game'],
        ['your groups', (db: DatabaseService) => new GroupQueries(db).getGroupsForAccount(1), 'UserGroup_createdBy'],
        ['invitations received', (db: DatabaseService) => new InvitationQueries(db).getUserInvitationsReceived(1), 'Invitation_toAccount'],
        ['games you will bring', (db: DatabaseService) => new SessionQueries(db).getGamesToBringForAccount(1), 'MeetGame_broughtByAccount'],
    ])('looks up %s with an index instead of reading the whole table', async (_name, run, index) => {
        const plan = await planOf(run)

        expect(plan).toMatch(new RegExp(`SEARCH \\w+ USING (COVERING )?INDEX ${index} \\(`))
        // No full read of a table or of a whole index.
        expect(plan).not.toMatch(/^SCAN /m)
    })

    it('reads the inbox already newest first, with no sort', async () => {
        const plan = await planOf(db => new NotificationQueries(db).getNotificationsByAccountId(1))

        expect(plan).not.toMatch(/TEMP B-TREE/)
    })

    describe('your groups', () => {
        beforeAll(async () => {
            // The groups' owners and members need no Account rows here, so foreign keys stay off for these rows.
            await client.executeMultiple(`
                PRAGMA foreign_keys = OFF;
                INSERT INTO UserGroup (id, name, createdBy) VALUES (1, 'Owned only', 7), (2, 'Someone else''s', 8),
                    (3, 'Owned and joined', 7), (4, 'Joined', 8), (5, 'Not mine', 9);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (7, 3), (7, 4), (8, 2), (8, 4), (9, 5);
            `)
        })

        it('lists the groups an account owns or belongs to, each once, oldest first', async () => {
            const groups = await new GroupQueries(asDatabase(stmt => client.execute(stmt))).getGroupsForAccount(7)

            expect(groups.rows.map(row => [row['id'], row['name']])).toEqual([
                [1, 'Owned only'],
                [3, 'Owned and joined'],
                [4, 'Joined'],
            ])
            expect(groups.columns).toEqual(expect.arrayContaining(['id', 'name', 'createdBy', 'createdAt']))
        })

        it('lists none for an account in no group', async () => {
            const groups = await new GroupQueries(asDatabase(stmt => client.execute(stmt))).getGroupsForAccount(99)

            expect(groups.rows).toEqual([])
        })
    })
})
