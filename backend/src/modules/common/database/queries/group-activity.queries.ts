import { PERSON_STANDING } from './groups.queries.js'

import type { GroupActivityEntry } from '../../../../common/types/group-activity.type.js'
import type { DatabaseService } from '../database.service.js'
import type { InStatement, Transaction } from '@libsql/client'

const INSERT_COLUMNS = 'groupId, actorAccountId, type, meetId, groupPersonId, gameId, subjectAccountId, data'

function entryArgs(entry: GroupActivityEntry) {
    return [
        entry.groupId,
        entry.actorAccountId,
        entry.type,
        entry.meetId ?? null,
        entry.groupPersonId ?? null,
        entry.gameId ?? null,
        entry.subjectAccountId ?? null,
        JSON.stringify(entry.data ?? {}),
    ]
}

/**
 * The statements that write a group history entry (ADR-0020), for the caller to run in the same
 * transaction or batch as the change it describes. With `onlyIfChanged`, the entry is written only
 * when the statement just before it changed a row (SQLite's `changes()`), so a change that turns out
 * to be a no-op leaves no entry.
 */
export function activityStatements(entry: GroupActivityEntry | undefined, options: { onlyIfChanged?: boolean } = {}): Array<InStatement> {
    if (!entry) return []

    return [
        options.onlyIfChanged
            ? {
                  sql: `INSERT INTO GroupActivity (${INSERT_COLUMNS}) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0`,
                  args: entryArgs(entry),
              }
            : { sql: `INSERT INTO GroupActivity (${INSERT_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: entryArgs(entry) },
    ]
}

/** Writes the entry inside the caller's transaction, just before it commits. */
export async function recordInTransaction(transaction: Transaction, entry: GroupActivityEntry | undefined): Promise<void> {
    for (const statement of activityStatements(entry)) await transaction.execute(statement)
}

/**
 * Group history (ADR-0020). Append-only: there is no update or delete here, and the database
 * refuses both while the group exists. Only deleting the group removes its history.
 */
export class GroupActivityQueries {
    constructor(private readonly database: DatabaseService) {}

    /** For a change that is already saved in its own transaction and has nothing to add the entry to. */
    record(entry: GroupActivityEntry) {
        return this.database.execute(activityStatements(entry)[0] as InStatement)
    }

    /** A page of the group's history, newest first, one row more than `limit` to tell whether more exist. */
    getPage(groupId: number, before: number | null, limit: number) {
        return this.database.execute({
            sql: `
                SELECT ga.id, ga.type, ga.createdAt, ga.actorAccountId, ga.meetId, ga.groupPersonId, ga.gameId,
                       ga.subjectAccountId, ga.data
                FROM GroupActivity ga
                WHERE ga.groupId = ? ${before === null ? '' : 'AND ga.id < ?'}
                ORDER BY ga.id DESC
                LIMIT ?
            `,
            args: before === null ? [groupId, limit + 1] : [groupId, before, limit + 1],
        })
    }

    /** Current names and standings of accounts in a group, the way the history shows them (ADR-0018). */
    getAccounts(groupId: number, accountIds: Array<number>) {
        return this.database.execute({
            sql: `
                SELECT a.id, COALESCE(NULLIF(TRIM(a.displayName), ''), a.username) AS name,
                    CASE
                        WHEN a.isDeleted = 1 THEN 'deleted'
                        WHEN ug.createdBy = a.id
                            OR EXISTS (SELECT 1 FROM GroupMembership gm WHERE gm.groupId = ug.id AND gm.accountId = a.id) THEN 'member'
                        ELSE 'left'
                    END AS standing
                FROM Account a
                INNER JOIN UserGroup ug ON ug.id = ?
                WHERE a.id IN (${accountIds.map(() => '?').join(', ')})
            `,
            args: [groupId, ...accountIds],
        })
    }

    /** Current names and standings of the group's people; people of other groups are never returned. */
    getPeople(groupId: number, groupPersonIds: Array<number>) {
        return this.database.execute({
            sql: `
                SELECT gp.id, gp.displayName, ${PERSON_STANDING}
                FROM GroupPerson gp
                WHERE gp.groupId = ? AND gp.id IN (${groupPersonIds.map(() => '?').join(', ')})
            `,
            args: [groupId, ...groupPersonIds],
        })
    }

    /** Game titles, the primary edition first, as the rest of the app shows them. */
    getGameTitles(gameIds: Array<number>) {
        return this.database.execute({
            sql: `
                SELECT g.id, COALESCE(gt_pr.title, gt_en.title, gt_es.title) AS title
                FROM Game g
                LEFT JOIN GameEdition gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameEdition gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                LEFT JOIN GameEdition gt_pr ON gt_pr.gameId = g.id AND gt_pr.isPrimary = 1
                WHERE g.id IN (${gameIds.map(() => '?').join(', ')})
            `,
            args: gameIds,
        })
    }
}
