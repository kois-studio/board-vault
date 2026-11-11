import { resolvedTitleSql } from '../resolved-title.js'

import { recordInTransaction } from './group-activity.queries.js'
import { PERSON_COLUMNS } from './groups.queries.js'
import { SUGGESTED_PERSON } from './invitations.queries.js'

import type { GroupActivityEntry } from '../../../../common/types/group-activity.type.js'
import type { DatabaseService } from '../database.service.js'
import type { InStatement } from '@libsql/client'

/** How long a takeover can be undone, and its snapshot kept (ADR-0027). */
export const TAKEOVER_UNDO_DAYS = 30

/** A takeover still inside its undo window. */
const OPEN = `t.createdAt > datetime('now', '-${TAKEOVER_UNDO_DAYS} days')`

/**
 * A group person as it was just before someone took it over (#278, ADR-0027): what undo puts back. Only the person's
 * own rows and the ids of the game nights it was on; nothing about the account that took it over.
 */
export type TakeoverSnapshot = {
    displayName: string
    avatar: string | null
    status: string
    ownership: Array<{
        gameId: number
        status: string
        source: string
        enteredByAccountId: number
        confirmedByAccountId: number | null
        createdAt: string | null
        updatedAt: string | null
    }>
    preferences: Array<{
        gameId: number
        preference: string
        source: string
        enteredByAccountId: number
        createdAt: string | null
        updatedAt: string | null
    }>
    meetIds: Array<number>
}

type PlayDetails = {
    participantPersonIds?: Array<number>
    results?: Array<{ groupPersonId?: number }>
}

/** Taking over a group person and undoing it (#278, ADR-0027). */
export class TakeoverQueries {
    constructor(private readonly database: DatabaseService) {}

    /**
     * The people an account may take over in a group, the suggested ones first, with what the group recorded for each:
     * the games they own (titles in the page's language) and the finished game nights they came to. Empty when the
     * account is one of the group's people already. Membership is the caller's.
     */
    async getChoices(groupId: number, accountId: number, locale: string) {
        const resolved = resolvedTitleSql('o.gameId', locale)
        const [people, games] = await Promise.all([
            this.database.execute({
                sql: `
                    SELECT ${PERSON_COLUMNS},
                        CASE WHEN ${SUGGESTED_PERSON} THEN 1 ELSE 0 END AS suggested,
                        (SELECT COUNT(*) FROM MeetPersonAttendee a INNER JOIN Meet m ON m.id = a.meetId
                         WHERE a.groupPersonId = gp.id AND a.attendanceStatus = 'attended' AND m.status = 'completed') AS nights,
                        (SELECT MAX(m.meetDate) FROM MeetPersonAttendee a INNER JOIN Meet m ON m.id = a.meetId
                         WHERE a.groupPersonId = gp.id AND a.attendanceStatus = 'attended' AND m.status = 'completed') AS lastNight
                    FROM GroupPerson gp
                    WHERE gp.groupId = ? AND gp.status = 'active' AND gp.kind = 'placeholder' AND gp.accountId IS NULL
                      AND NOT EXISTS (SELECT 1 FROM GroupPerson own WHERE own.groupId = gp.groupId AND own.accountId = ?)
                    ORDER BY suggested DESC, gp.displayName COLLATE NOCASE ASC, gp.id ASC
                `,
                args: [accountId, groupId, accountId],
            }),
            this.database.execute({
                sql: `
                    SELECT o.groupPersonId, o.gameId, ${resolved.title} AS title
                    FROM GroupPersonGameOwnership o
                    INNER JOIN GroupPerson gp ON gp.id = o.groupPersonId
                    WHERE gp.groupId = ? AND gp.kind = 'placeholder' AND gp.status = 'active' AND o.status = 'asserted'
                    ORDER BY title COLLATE NOCASE ASC
                `,
                args: [groupId],
            }),
        ])

        return { people: people.rows, games: games.rows }
    }

    /** The takeovers in a group that can still be undone, with the name the person had before. */
    async getOpen(groupId: number) {
        const rows = (
            await this.database.execute({
                sql: `
                    SELECT t.groupPersonId, t.accountId, t.snapshot, t.createdAt,
                           datetime(t.createdAt, '+${TAKEOVER_UNDO_DAYS} days') AS undoableUntil
                    FROM GroupPersonTakeover t
                    INNER JOIN GroupPerson gp ON gp.id = t.groupPersonId AND gp.groupId = t.groupId AND gp.accountId = t.accountId
                    WHERE t.groupId = ? AND ${OPEN}
                    ORDER BY t.createdAt DESC
                `,
                args: [groupId],
            })
        ).rows

        return rows.map(row => ({
            groupPersonId: Number(row.groupPersonId),
            accountId: Number(row.accountId),
            previousName: (JSON.parse(String(row.snapshot)) as TakeoverSnapshot).displayName,
            takenAt: String(row.createdAt),
            undoableUntil: String(row.undoableUntil),
        }))
    }

    /**
     * Undoes a takeover (ADR-0027). The person gets back the name, picture, games and preferences of the snapshot,
     * and stays on the game nights it was on before. The account that took it over becomes a new person of its own,
     * with the game nights and the games and preferences that were added after the takeover. Returns null when there is
     * nothing to undo: no takeover, past its window, or the person is no longer linked to that account.
     */
    async undo(input: {
        groupId: number
        groupPersonId: number
        actorAccountId: number
    }): Promise<{ accountId: number; newPersonId: number } | null> {
        const transaction = await this.database.transaction('write')

        try {
            const [takeover] = (
                await transaction.execute({
                    sql: `
                        SELECT t.accountId, t.snapshot, t.createdAt
                        FROM GroupPersonTakeover t
                        INNER JOIN GroupPerson gp
                            ON gp.id = t.groupPersonId AND gp.groupId = t.groupId AND gp.accountId = t.accountId AND gp.kind = 'linked'
                        WHERE t.groupPersonId = ? AND t.groupId = ? AND ${OPEN}
                    `,
                    args: [input.groupPersonId, input.groupId],
                })
            ).rows

            if (!takeover) {
                await transaction.commit()
                return null
            }

            const accountId = Number(takeover.accountId)
            const snapshot = JSON.parse(String(takeover.snapshot)) as TakeoverSnapshot
            const person = input.groupPersonId
            const keptMeets = JSON.stringify(snapshot.meetIds)
            const notKept = 'meetId NOT IN (SELECT value FROM json_each(?))'

            await transaction.execute({
                sql: `
                    UPDATE GroupPerson
                    SET accountId = NULL, kind = 'placeholder', displayName = ?, avatar = ?, status = ?, claimedAt = NULL,
                        updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ? AND groupId = ?
                `,
                args: [snapshot.displayName, snapshot.avatar, snapshot.status, person, input.groupId],
            })

            const created = await transaction.execute({
                sql: `
                    INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, avatar, createdByAccountId, claimedAt)
                    SELECT ?, a.id, 'linked', 'active', COALESCE(NULLIF(a.displayName, ''), a.username), a.avatar, ?, ?
                    FROM Account a
                    WHERE a.id = ?
                `,
                args: [input.groupId, input.actorAccountId, String(takeover.createdAt), accountId],
            })
            const newPerson = Number(created.lastInsertRowid)
            const snapshotOwnership = JSON.stringify(snapshot.ownership.map(row => row.gameId))
            const snapshotPreferences = JSON.stringify(snapshot.preferences.map(row => row.gameId))

            await transaction.batch([
                // Game nights the person was not on before the takeover were the new member's.
                {
                    sql: `UPDATE MeetPersonAttendee SET groupPersonId = ? WHERE groupPersonId = ? AND ${notKept}`,
                    args: [newPerson, person, keptMeets],
                },
                {
                    sql: `UPDATE MeetPersonGame SET groupPersonId = ? WHERE groupPersonId = ? AND ${notKept}`,
                    args: [newPerson, person, keptMeets],
                },
                {
                    sql: `UPDATE MeetGameResult SET groupPersonId = ? WHERE groupPersonId = ? AND ${notKept}`,
                    args: [newPerson, person, keptMeets],
                },
                {
                    sql: `UPDATE MeetGame SET broughtByPersonId = ? WHERE broughtByPersonId = ? AND ${notKept}`,
                    args: [newPerson, person, keptMeets],
                },
                // Games and preferences entered after the takeover for other games were about the new member; the rest
                // goes back to the snapshot, including anything removed since.
                {
                    sql: `
                        INSERT INTO GroupPersonGameOwnership
                            (groupPersonId, gameId, status, source, enteredByAccountId, confirmedByAccountId, createdAt, updatedAt)
                        SELECT ?, gameId, status, source, enteredByAccountId, confirmedByAccountId, createdAt, updatedAt
                        FROM GroupPersonGameOwnership
                        WHERE groupPersonId = ? AND gameId NOT IN (SELECT value FROM json_each(?))
                    `,
                    args: [newPerson, person, snapshotOwnership],
                },
                { sql: 'DELETE FROM GroupPersonGameOwnership WHERE groupPersonId = ?', args: [person] },
                {
                    sql: `
                        INSERT INTO GroupPersonGamePreference (groupPersonId, gameId, preference, source, enteredByAccountId, createdAt, updatedAt)
                        SELECT ?, gameId, preference, source, enteredByAccountId, createdAt, updatedAt
                        FROM GroupPersonGamePreference
                        WHERE groupPersonId = ? AND gameId NOT IN (SELECT value FROM json_each(?))
                    `,
                    args: [newPerson, person, snapshotPreferences],
                },
                { sql: 'DELETE FROM GroupPersonGamePreference WHERE groupPersonId = ?', args: [person] },
                ...snapshot.ownership.map((row): InStatement => ({
                    sql: `
                            INSERT INTO GroupPersonGameOwnership
                                (groupPersonId, gameId, status, source, enteredByAccountId, confirmedByAccountId, createdAt, updatedAt)
                            SELECT ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP)
                            WHERE EXISTS (SELECT 1 FROM Game WHERE id = ?)
                        `,
                    args: [
                        person,
                        row.gameId,
                        row.status,
                        row.source,
                        row.enteredByAccountId,
                        row.confirmedByAccountId,
                        row.createdAt,
                        row.updatedAt,
                        row.gameId,
                    ],
                })),
                ...snapshot.preferences.map((row): InStatement => ({
                    sql: `
                            INSERT INTO GroupPersonGamePreference (groupPersonId, gameId, preference, source, enteredByAccountId, createdAt, updatedAt)
                            SELECT ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP)
                            WHERE EXISTS (SELECT 1 FROM Game WHERE id = ?)
                        `,
                    args: [
                        person,
                        row.gameId,
                        row.preference,
                        row.source,
                        row.enteredByAccountId,
                        row.createdAt,
                        row.updatedAt,
                        row.gameId,
                    ],
                })),
            ])

            // Plays keep their people in JSON (ADR-0022): the same move, play by play.
            const plays = await transaction.execute({
                sql: `
                    SELECT meetId, position, details FROM MeetPlay
                    WHERE meetId IN (
                        SELECT meetId FROM MeetPersonGame WHERE groupPersonId = ?
                        UNION SELECT meetId FROM MeetGameResult WHERE groupPersonId = ?
                        UNION SELECT meetId FROM MeetPersonAttendee WHERE groupPersonId = ?
                    )
                `,
                args: [newPerson, newPerson, newPerson],
            })
            const moved: Array<InStatement> = []

            for (const play of plays.rows) {
                const details = JSON.parse(String(play.details)) as PlayDetails
                const swap = (id: number | undefined) => (id === person ? newPerson : id)
                const before = JSON.stringify(details)

                if (details.participantPersonIds) details.participantPersonIds = details.participantPersonIds.map(id => swap(id) as number)
                for (const result of details.results ?? []) {
                    if (result.groupPersonId !== undefined) result.groupPersonId = swap(result.groupPersonId)
                }
                if (JSON.stringify(details) !== before) {
                    moved.push({
                        sql: 'UPDATE MeetPlay SET details = ? WHERE meetId = ? AND position = ?',
                        args: [JSON.stringify(details), Number(play.meetId), Number(play.position)],
                    })
                }
            }
            if (moved.length > 0) await transaction.batch(moved)

            const activity: GroupActivityEntry = {
                groupId: input.groupId,
                actorAccountId: input.actorAccountId,
                type: 'person_takeover_undone',
                groupPersonId: person,
                subjectAccountId: accountId,
                data: { newPersonId: newPerson },
            }

            await recordInTransaction(transaction, activity)
            await transaction.execute({ sql: 'DELETE FROM GroupPersonTakeover WHERE groupPersonId = ?', args: [person] })
            await transaction.commit()
            return { accountId, newPersonId: newPerson }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    /** For the daily job: snapshots past their undo window. */
    deleteExpired() {
        return this.database.execute(`DELETE FROM GroupPersonTakeover WHERE createdAt <= datetime('now', '-${TAKEOVER_UNDO_DAYS} days')`)
    }
}
