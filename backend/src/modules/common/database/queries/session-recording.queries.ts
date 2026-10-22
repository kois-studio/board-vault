import { activityStatements } from './group-activity.queries.js'

import type { CorrectSessionBody, PlaySessionGameBody } from '../../../../common/types/session.type.js'
import type { DatabaseService } from '../database.service.js'
import type { InStatement, Transaction } from '@libsql/client'

export async function writePlays(transaction: Transaction, meetId: number, plays: PlaySessionGameBody[]): Promise<void> {
    const statements: InStatement[] = [{ sql: 'DELETE FROM MeetPlay WHERE meetId = ?', args: [meetId] }]

    for (const [position, play] of plays.entries()) {
        statements.push({
            sql: 'INSERT INTO MeetPlay (meetId, position, gameId, details) VALUES (?, ?, ?, ?)',
            args: [meetId, position, play.gameId, JSON.stringify(play)],
        })
    }
    // Compatibility projection: one result per person/game; per-play scores remain in MeetPlay.
    statements.push({ sql: 'DELETE FROM MeetGameResult WHERE meetId = ?', args: [meetId] })
    const results = new Map<
        string,
        { gameId: number; accountId: number | null; personId: number | null; winner: boolean; score: number | null }
    >()

    for (const play of plays) {
        for (const result of play.results ?? []) {
            const key = `${play.gameId}:${result.accountId === undefined ? `p${result.groupPersonId}` : `a${result.accountId}`}`
            const prior = results.get(key)

            results.set(key, {
                gameId: play.gameId,
                accountId: result.accountId ?? null,
                personId: result.groupPersonId ?? null,
                winner: Boolean(prior?.winner || result.isWinner),
                score: plays.filter(item => item.gameId === play.gameId).length === 1 ? (result.score ?? null) : null,
            })
        }
    }
    for (const result of results.values()) {
        if (!result.winner && result.score === null) continue
        statements.push({
            sql: 'INSERT INTO MeetGameResult (meetId, gameId, accountId, groupPersonId, isWinner, score) VALUES (?, ?, ?, ?, ?, ?)',
            args: [meetId, result.gameId, result.accountId, result.personId, result.winner ? 1 : 0, result.score],
        })
    }
    await transaction.batch(statements)
}

export class RecordingQueries {
    constructor(private readonly database: DatabaseService) {}

    async getRecordingRevision(meetId: number): Promise<number> {
        const result = await this.database.execute({ sql: 'SELECT recordingRevision FROM Meet WHERE id = ?', args: [meetId] })

        return Number(result.rows[0]?.recordingRevision ?? 0)
    }

    async getRecordedPlays(meetId: number): Promise<PlaySessionGameBody[]> {
        const result = await this.database.execute({
            sql: 'SELECT details FROM MeetPlay WHERE meetId = ? ORDER BY position',
            args: [meetId],
        })

        return result.rows.map(row => JSON.parse(String(row.details)) as PlaySessionGameBody)
    }

    async replacePlayResults(meetId: number, actorId: number, body: CorrectSessionBody): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            const guard = await transaction.execute({
                sql: `UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = ? AND recordingRevision = ? AND status IN ('active', 'completed') AND EXISTS (SELECT 1 FROM GroupMembership WHERE groupId = Meet.groupId AND accountId = ?)`,
                args: [meetId, body.revision, actorId],
            })

            if (guard.rowsAffected !== 1) {
                await transaction.rollback()
                return false
            }
            await writePlays(transaction, meetId, body.games)
            await transaction.batch(
                activityStatements({
                    groupId: body.groupId,
                    actorAccountId: actorId,
                    type: 'session_results_changed',
                    meetId,
                    data: { plays: body.games.length },
                }),
            )
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async correctRecording(meetId: number, actorId: number, body: CorrectSessionBody): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            // Recheck membership, role and revision under the write lock. A concurrent leave, finish,
            // results edit or correction must never be overwritten by a stale browser form.
            const updated = await transaction.execute({
                sql: `UPDATE Meet SET meetDate = ?, timezone = ?, notes = ?, recordingRevision = recordingRevision + 1
                    WHERE id = ? AND groupId = ? AND recordingRevision = ? AND status IN ('active', 'completed')
                    AND EXISTS (SELECT 1 FROM GroupMembership WHERE groupId = Meet.groupId AND accountId = ?)
                    AND (createdBy = ? OR EXISTS (SELECT 1 FROM UserGroup WHERE id = Meet.groupId AND createdBy = ?)
                        OR EXISTS (SELECT 1 FROM MeetAttendee WHERE meetId = Meet.id AND accountId = ? AND rsvpStatus <> 'declined')
                        OR EXISTS (SELECT 1 FROM MeetPersonAttendee a JOIN GroupPerson p ON p.id = a.groupPersonId WHERE a.meetId = Meet.id AND p.accountId = ? AND a.rsvpStatus <> 'declined'))`,
                args: [
                    body.sessionDate,
                    body.timezone,
                    body.notes ?? null,
                    meetId,
                    body.groupId,
                    body.revision,
                    actorId,
                    actorId,
                    actorId,
                    actorId,
                    actorId,
                ],
            })

            if (updated.rowsAffected !== 1) {
                await transaction.rollback()
                return false
            }
            const status = String(
                (await transaction.execute({ sql: 'SELECT status FROM Meet WHERE id = ?', args: [meetId] })).rows[0]?.status,
            )
            const notIn = (column: string, ids: number[]) => (ids.length ? `AND ${column} NOT IN (${ids.map(() => '?').join(',')})` : '')
            const keptGameIds = [...new Set(body.games.map(play => play.gameId))]

            await transaction.batch([
                { sql: 'DELETE FROM MeetGameResult WHERE meetId = ?', args: [meetId] },
                { sql: 'DELETE FROM MeetAccountGame WHERE meetId = ?', args: [meetId] },
                { sql: 'DELETE FROM MeetPersonGame WHERE meetId = ?', args: [meetId] },
                // A game taken out of the record was only "shortlisted but not played" if the shortlist left a
                // trace (votes or someone bringing it); otherwise it was only ever recorded as played, so it goes.
                {
                    sql: `UPDATE MeetGame SET gameStatus = 'skipped' WHERE meetId = ? AND gameStatus = 'played'
                        AND (broughtByAccountId IS NOT NULL OR broughtByPersonId IS NOT NULL
                            OR EXISTS (SELECT 1 FROM MeetGameVote v WHERE v.meetId = MeetGame.meetId AND v.gameId = MeetGame.gameId))
                        ${notIn('gameId', keptGameIds)}`,
                    args: [meetId, ...keptGameIds],
                },
                {
                    sql: `DELETE FROM MeetGame WHERE meetId = ? AND gameStatus = 'played' ${notIn('gameId', keptGameIds)}`,
                    args: [meetId, ...keptGameIds],
                },
            ])
            const accounts = body.attendeeIds ?? []
            const people = body.groupPersonIds ?? []

            if (status === 'completed') {
                // A finished night keeps its invitations and answers; whoever is no longer recorded simply did not come.
                await transaction.batch([
                    {
                        sql: `UPDATE MeetAttendee SET attendanceStatus = 'absent' WHERE meetId = ? AND attendanceStatus = 'attended' ${notIn('accountId', accounts)}`,
                        args: [meetId, ...accounts],
                    },
                    {
                        sql: `UPDATE MeetPersonAttendee SET attendanceStatus = 'absent' WHERE meetId = ? AND attendanceStatus = 'attended' ${notIn('groupPersonId', people)}`,
                        args: [meetId, ...people],
                    },
                ])
            } else {
                // While a night is on, the organizer's correction is the invitation list (checked by the service).
                await transaction.batch([
                    { sql: `DELETE FROM MeetAttendee WHERE meetId = ? ${notIn('accountId', accounts)}`, args: [meetId, ...accounts] },
                    {
                        sql: `DELETE FROM MeetPersonAttendee WHERE meetId = ? ${notIn('groupPersonId', people)}`,
                        args: [meetId, ...people],
                    },
                ])
            }
            const statements: InStatement[] = []

            for (const id of body.attendeeIds ?? [])
                statements.push({
                    sql: "INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, 'accepted', 'attended') ON CONFLICT(meetId, accountId) DO UPDATE SET attendanceStatus = 'attended'",
                    args: [meetId, id],
                })
            for (const id of body.groupPersonIds ?? [])
                statements.push({
                    sql: "INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES (?, ?, 'accepted', 'attended') ON CONFLICT(meetId, groupPersonId) DO UPDATE SET attendanceStatus = 'attended'",
                    args: [meetId, id],
                })
            for (const play of body.games) {
                statements.push({
                    sql: "INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'played') ON CONFLICT(meetId, gameId) DO UPDATE SET gameStatus = 'played'",
                    args: [meetId, play.gameId],
                })
                for (const id of play.participantIds ?? [])
                    statements.push({
                        sql: 'INSERT OR IGNORE INTO MeetAccountGame (meetId, accountId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, id, play.gameId],
                    })
                for (const id of play.participantPersonIds ?? [])
                    statements.push({
                        sql: 'INSERT OR IGNORE INTO MeetPersonGame (meetId, groupPersonId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, id, play.gameId],
                    })
            }
            await transaction.batch(statements)
            await writePlays(transaction, meetId, body.games)
            await transaction.batch(
                activityStatements({
                    groupId: body.groupId,
                    actorAccountId: actorId,
                    type: 'session_played_changed',
                    meetId,
                    data: { corrected: true, gameIds: [...new Set(body.games.map(play => play.gameId))], plays: body.games.length },
                }),
            )
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }
}
