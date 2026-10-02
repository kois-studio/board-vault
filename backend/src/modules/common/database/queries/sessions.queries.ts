import type { MeetAccountGameQueryOptions } from '../../../../modules/core/meet-account-games/meet-account-games.types'
import type { DatabaseService } from '../database.service'
import type { InStatement } from '@libsql/client'

type CompletedSessionInput = {
    groupId: number
    createdBy: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds: Array<number>
    groupPersonIds?: Array<number>
    games: Array<{ gameId: number; participantIds: Array<number> }>
    personGames?: Array<{ gameId: number; participantIds: Array<number> }>
}

type ScheduledSessionInput = {
    groupId: number
    createdBy: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds: Array<number>
    groupPersonIds?: Array<number>
    plannedGameIds: Array<number>
}

/** A result only stays while its person is still recorded as playing that game. */
function deleteOrphanedResults(meetId: number): InStatement {
    return {
        sql: `
            DELETE FROM MeetGameResult
            WHERE meetId = ?
              AND (
                (accountId IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM MeetAccountGame mag
                    WHERE mag.meetId = MeetGameResult.meetId AND mag.gameId = MeetGameResult.gameId AND mag.accountId = MeetGameResult.accountId
                ))
                OR (groupPersonId IS NOT NULL AND NOT EXISTS (
                    SELECT 1 FROM MeetPersonGame mpg
                    WHERE mpg.meetId = MeetGameResult.meetId AND mpg.gameId = MeetGameResult.gameId AND mpg.groupPersonId = MeetGameResult.groupPersonId
                ))
              )
        `,
        args: [meetId],
    }
}

export type GameResultRow = { accountId: number | null; groupPersonId: number | null; isWinner: boolean; score: number | null }

/** Game sessions (`Meet` tables): attendees, played games, and per-account games. */
export class SessionQueries {
    constructor(private readonly database: DatabaseService) {}

    getMeetsForAccount(accountId: number) {
        return this.database.execute({
            sql: `
                SELECT DISTINCT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
                WHERE gm.accountId = ?
            `,
            args: [accountId],
        })
    }

    /** Sessions in groups the account belongs to; others are left out. */
    getMeetsByIdsForAccount(meetIds: Array<number>, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
                WHERE m.id IN (${meetIds.map(() => '?').join(', ')}) AND gm.accountId = ?
            `,
            args: [...meetIds, accountId],
        })
    }

    /**
     * Everything a history record needs about many sessions, in six queries
     * whatever the number of sessions.
     */
    async getHistoryDetailsByMeetIds(meetIds: Array<number>) {
        const ids = meetIds.map(() => '?').join(', ')
        const [attendedAccounts, attendedPeople, playedGames, personPlays, accountPlays, winners] = await Promise.all([
            this.database.execute({
                sql: `SELECT meetId, accountId FROM MeetAttendee WHERE meetId IN (${ids}) AND attendanceStatus = 'attended'`,
                args: meetIds,
            }),
            this.database.execute({
                sql: `SELECT meetId, groupPersonId FROM MeetPersonAttendee WHERE meetId IN (${ids}) AND attendanceStatus = 'attended'`,
                args: meetIds,
            }),
            this.database.execute({
                sql: `SELECT meetId, gameId FROM MeetGame WHERE meetId IN (${ids}) AND gameStatus = 'played' ORDER BY meetId, playOrder ASC, gameId ASC`,
                args: meetIds,
            }),
            this.database.execute({
                sql: `SELECT meetId, gameId, groupPersonId FROM MeetPersonGame WHERE meetId IN (${ids}) ORDER BY groupPersonId`,
                args: meetIds,
            }),
            this.database.execute({
                sql: `SELECT DISTINCT meetId, gameId, accountId FROM MeetAccountGame WHERE meetId IN (${ids}) ORDER BY accountId`,
                args: meetIds,
            }),
            this.database.execute({
                sql: `SELECT meetId, gameId, accountId, groupPersonId FROM MeetGameResult WHERE meetId IN (${ids}) AND isWinner = 1`,
                args: meetIds,
            }),
        ])
        const group = <T>(rows: Array<Record<string, unknown>>, value: (row: Record<string, unknown>) => T) => {
            const byMeet = new Map<number, Array<T>>()

            for (const row of rows) byMeet.set(Number(row.meetId), [...(byMeet.get(Number(row.meetId)) ?? []), value(row)])
            return byMeet
        }

        return {
            attendedAccountIds: group(attendedAccounts.rows, row => Number(row.accountId)),
            attendedPersonIds: group(attendedPeople.rows, row => Number(row.groupPersonId)),
            playedGameIds: group(playedGames.rows, row => Number(row.gameId)),
            personPlays: group(personPlays.rows, row => ({ gameId: Number(row.gameId), personId: Number(row.groupPersonId) })),
            accountPlays: group(accountPlays.rows, row => ({ gameId: Number(row.gameId), accountId: Number(row.accountId) })),
            winners: group(winners.rows, row => ({
                gameId: Number(row.gameId),
                accountId: row.accountId === null ? null : Number(row.accountId),
                personId: row.groupPersonId === null ? null : Number(row.groupPersonId),
            })),
        }
    }

    getMeetByIdForAccount(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
                WHERE m.id = ? AND gm.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    getMeetByIdForCreator(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT m.id, m.groupId, m.createdBy, m.meetDate, m.isConfirmed,
                    m.status, m.timezone, m.notes
                FROM Meet m
                INNER JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = ?
                WHERE m.id = ? AND m.createdBy = ?
            `,
            args: [accountId, meetId, accountId],
        })
    }

    async updateMeetStatus(
        meetId: number,
        expectedStatus: 'scheduled' | 'active' | 'completed' | 'cancelled',
        status: 'scheduled' | 'active' | 'completed' | 'cancelled',
    ) {
        const transaction = await this.database.transaction('write')

        try {
            const result = await transaction.execute({
                sql: `
                    UPDATE Meet
                    SET status = ?, isConfirmed = ?, updatedAt = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = ?
                `,
                args: [status, status === 'completed' || status === 'cancelled', meetId, expectedStatus],
            })

            if (result.rowsAffected === 1 && (status === 'completed' || status === 'cancelled')) {
                await transaction.execute({
                    sql: `
                        UPDATE MeetGame
                        SET gameStatus = 'skipped'
                        WHERE meetId = ? AND gameStatus = 'planned'
                    `,
                    args: [meetId],
                })
            }

            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async replaceMeetPlannedGames(meetId: number, gameIds: Array<number>, expectedStatus: 'scheduled' | 'active'): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return false
            }

            await transaction.execute({
                sql: "DELETE FROM MeetGame WHERE meetId = ? AND gameStatus = 'planned'",
                args: [meetId],
            })
            if (gameIds.length > 0) {
                await transaction.batch(
                    gameIds.map(gameId => ({
                        sql: "INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'planned')",
                        args: [meetId, gameId],
                    })),
                )
            }
            await transaction.commit()
            return true
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async replaceMeetPlayedGames(
        meetId: number,
        games: Array<{ gameId: number; participantIds: Array<number> }>,
        expectedStatus: 'scheduled' | 'active',
        personGames: Array<{ gameId: number; participantIds: Array<number> }> = [],
    ): Promise<{
        applied: boolean
        playedGameIds: Array<number>
        skippedGameIds: Array<number>
        playedGameParticipants: Array<{ gameId: number; participantIds: Array<number> }>
    }> {
        const transaction = await this.database.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return { applied: false, playedGameIds: [], skippedGameIds: [], playedGameParticipants: [] }
            }

            const gameIds = games.map(game => game.gameId)
            const placeholders = gameIds.map(() => '?').join(', ')
            const keepPlayedCondition = gameIds.length > 0 ? `AND gameId NOT IN (${placeholders})` : ''

            await transaction.execute({
                sql: `
                    UPDATE MeetGame
                    SET gameStatus = 'skipped'
                    WHERE meetId = ? AND gameStatus IN ('planned', 'played') ${keepPlayedCondition}
                `,
                args: [meetId, ...gameIds],
            })

            if (gameIds.length > 0) {
                await transaction.execute({
                    sql: `UPDATE MeetGame SET gameStatus = 'played' WHERE meetId = ? AND gameId IN (${placeholders})`,
                    args: [meetId, ...gameIds],
                })
                await transaction.batch(
                    gameIds.map(gameId => ({
                        sql: "INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'played')",
                        args: [meetId, gameId],
                    })),
                )
            }

            await transaction.execute({
                sql: 'DELETE FROM MeetAccountGame WHERE meetId = ?',
                args: [meetId],
            })

            const participantStatements: Array<InStatement> = []

            for (const game of games) {
                for (const accountId of game.participantIds) {
                    participantStatements.push({
                        sql: 'INSERT OR IGNORE INTO MeetAccountGame (meetId, accountId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, accountId, game.gameId],
                    })
                }
            }
            if (participantStatements.length > 0) {
                await transaction.batch(participantStatements)
            }

            await transaction.execute({ sql: 'DELETE FROM MeetPersonGame WHERE meetId = ?', args: [meetId] })
            const personParticipantStatements: Array<InStatement> = []

            for (const game of personGames) {
                for (const groupPersonId of game.participantIds) {
                    personParticipantStatements.push({
                        sql: 'INSERT OR IGNORE INTO MeetPersonGame (meetId, groupPersonId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, groupPersonId, game.gameId],
                    })
                }
            }
            if (personParticipantStatements.length > 0) await transaction.batch(personParticipantStatements)

            await transaction.execute(deleteOrphanedResults(meetId))

            const result = await transaction.execute({
                sql: "SELECT gameId, gameStatus FROM MeetGame WHERE meetId = ? AND gameStatus IN ('played', 'skipped')",
                args: [meetId],
            })
            const participantResult = await transaction.execute({
                sql: 'SELECT gameId, accountId FROM MeetAccountGame WHERE meetId = ? ORDER BY gameId ASC, accountId ASC',
                args: [meetId],
            })

            await transaction.commit()

            const participantMap = new Map<number, Array<number>>()

            for (const row of participantResult.rows) {
                const gameId = Number(row[0])
                const participantIds = participantMap.get(gameId) ?? []

                participantIds.push(Number(row[1]))
                participantMap.set(gameId, participantIds)
            }

            return {
                applied: true,
                playedGameIds: result.rows.filter(row => String(row[1]) === 'played').map(row => Number(row[0])),
                skippedGameIds: result.rows.filter(row => String(row[1]) === 'skipped').map(row => Number(row[0])),
                playedGameParticipants: [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds })),
            }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async replaceMeetPlayedPersonGames(
        meetId: number,
        games: Array<{ gameId: number; participantIds: Array<number> }>,
        expectedStatus: 'scheduled' | 'active',
    ): Promise<{
        applied: boolean
        playedGameIds: Array<number>
        skippedGameIds: Array<number>
        playedGameParticipants: Array<{ gameId: number; participantIds: Array<number> }>
    }> {
        const transaction = await this.database.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return { applied: false, playedGameIds: [], skippedGameIds: [], playedGameParticipants: [] }
            }

            const gameIds = games.map(game => game.gameId)
            const placeholders = gameIds.map(() => '?').join(', ')
            const keepPlayedCondition = gameIds.length > 0 ? `AND gameId NOT IN (${placeholders})` : ''

            await transaction.execute({
                sql: `
                    UPDATE MeetGame
                    SET gameStatus = 'skipped'
                    WHERE meetId = ? AND gameStatus IN ('planned', 'played') ${keepPlayedCondition}
                `,
                args: [meetId, ...gameIds],
            })

            if (gameIds.length > 0) {
                await transaction.execute({
                    sql: `UPDATE MeetGame SET gameStatus = 'played' WHERE meetId = ? AND gameId IN (${placeholders})`,
                    args: [meetId, ...gameIds],
                })
                await transaction.batch(
                    gameIds.map(gameId => ({
                        sql: "INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus) VALUES (?, ?, 'played')",
                        args: [meetId, gameId],
                    })),
                )
            }

            await transaction.execute({ sql: 'DELETE FROM MeetPersonGame WHERE meetId = ?', args: [meetId] })
            const participantStatements: Array<InStatement> = []

            for (const game of games) {
                for (const groupPersonId of game.participantIds) {
                    participantStatements.push({
                        sql: 'INSERT OR IGNORE INTO MeetPersonGame (meetId, groupPersonId, gameId) VALUES (?, ?, ?)',
                        args: [meetId, groupPersonId, game.gameId],
                    })
                }
            }
            if (participantStatements.length > 0) await transaction.batch(participantStatements)

            await transaction.execute(deleteOrphanedResults(meetId))

            const result = await transaction.execute({
                sql: "SELECT gameId, gameStatus FROM MeetGame WHERE meetId = ? AND gameStatus IN ('played', 'skipped')",
                args: [meetId],
            })
            const participantResult = await transaction.execute({
                sql: 'SELECT gameId, groupPersonId FROM MeetPersonGame WHERE meetId = ? ORDER BY gameId ASC, groupPersonId ASC',
                args: [meetId],
            })

            await transaction.commit()

            const participantMap = new Map<number, Array<number>>()

            for (const row of participantResult.rows) {
                const gameId = Number(row[0])
                const participantIds = participantMap.get(gameId) ?? []

                participantIds.push(Number(row[1]))
                participantMap.set(gameId, participantIds)
            }

            return {
                applied: true,
                playedGameIds: result.rows.filter(row => String(row[1]) === 'played').map(row => Number(row[0])),
                skippedGameIds: result.rows.filter(row => String(row[1]) === 'skipped').map(row => Number(row[0])),
                playedGameParticipants: [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds })),
            }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async getPlayedGameIdsByMeetId(meetId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: "SELECT gameId FROM MeetGame WHERE meetId = ? AND gameStatus = 'played' ORDER BY playOrder ASC, gameId ASC",
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetPlayedGameParticipants(meetId: number): Promise<Array<{ gameId: number; participantIds: Array<number> }>> {
        const resultSet = await this.database.execute({
            sql: `
                SELECT gameId, accountId
                FROM MeetAccountGame
                WHERE meetId = ?
                ORDER BY gameId ASC, accountId ASC
            `,
            args: [meetId],
        })

        const participantMap = new Map<number, Array<number>>()

        for (const row of resultSet.rows) {
            const gameId = Number(row[0])
            const participantIds = participantMap.get(gameId) ?? []

            participantIds.push(Number(row[1]))
            participantMap.set(gameId, participantIds)
        }

        return [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds }))
    }

    getMeetMember(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT 1
                FROM Meet m
                LEFT JOIN GroupMembership gm ON gm.groupId = m.groupId AND gm.accountId = ?
                WHERE m.id = ? AND (gm.accountId IS NOT NULL OR m.createdBy = ?)
            `,
            args: [accountId, meetId, accountId],
        })
    }

    getMeetsByGroupId(groupId: number) {
        return this.database.execute({
            sql: `
                SELECT id, groupId, createdBy, meetDate, isConfirmed,
                    status, timezone, notes
                FROM Meet
                WHERE groupId = ?
            `,
            args: [groupId],
        })
    }

    getMeetDetailsByIdForAccount(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
            SELECT 
                m.id,
                m.groupId,
                m.createdBy,
                m.meetDate,
                m.isConfirmed,
                (
                    SELECT json_group_array(ma.accountId)
                    FROM MeetAttendee ma
                    WHERE ma.meetId = m.id
                ) AS attendees,
                (
                    SELECT json_group_array(json_object(
                        'accountId', ma.accountId,
                        'rsvpStatus', ma.rsvpStatus,
                        'attendanceStatus', ma.attendanceStatus
                    ))
                    FROM MeetAttendee ma
                    WHERE ma.meetId = m.id
                ) AS attendeeStatuses,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'played'
                ) AS playedGames,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'planned'
                ) AS plannedGames,
                (
                    SELECT json_group_array(mg.gameId)
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'skipped'
                ) AS skippedGames,
                (
                    SELECT COALESCE(json_group_array(json_object(
                        'gameId', mg.gameId,
                        'participantIds', json(COALESCE((
                            SELECT json_group_array(mag.accountId)
                            FROM MeetAccountGame mag
                            WHERE mag.meetId = m.id AND mag.gameId = mg.gameId
                        ), '[]'))
                    )), '[]')
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'played'
                ) AS playedGameParticipants,
                m.status,
                m.timezone,
                m.notes,
                (
                    SELECT json_group_array(mpa.groupPersonId)
                    FROM MeetPersonAttendee mpa
                    WHERE mpa.meetId = m.id
                ) AS participants,
                (
                    SELECT json_group_array(json_object(
                        'groupPersonId', mpa.groupPersonId,
                        'rsvpStatus', mpa.rsvpStatus,
                        'attendanceStatus', mpa.attendanceStatus
                    ))
                    FROM MeetPersonAttendee mpa
                    WHERE mpa.meetId = m.id
                ) AS participantStatuses,
                (
                    SELECT COALESCE(json_group_array(json_object(
                        'gameId', mg.gameId,
                        'participantIds', json(COALESCE((
                            SELECT json_group_array(mpg.groupPersonId)
                            FROM MeetPersonGame mpg
                            WHERE mpg.meetId = m.id AND mpg.gameId = mg.gameId
                        ), '[]'))
                    )), '[]')
                    FROM MeetGame mg
                    WHERE mg.meetId = m.id AND mg.gameStatus = 'played'
                ) AS playedGamePersonParticipants,
                (
                    SELECT json_group_array(json_object(
                        'gameId', r.gameId,
                        'accountId', r.accountId,
                        'groupPersonId', r.groupPersonId,
                        'isWinner', r.isWinner,
                        'score', r.score
                    ))
                    FROM MeetGameResult r
                    WHERE r.meetId = m.id
                ) AS gameResults
            FROM Meet m
            INNER JOIN GroupMembership gm ON gm.groupId = m.groupId
            WHERE m.id = ? AND gm.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    getMeetAttendeeForAccount(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT ma.meetId, ma.accountId, ma.rsvpStatus, ma.attendanceStatus, ma.respondedAt, m.status
                FROM MeetAttendee ma
                INNER JOIN Meet m ON m.id = ma.meetId
                WHERE ma.meetId = ? AND ma.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    updateMeetAttendeeRsvp(meetId: number, accountId: number, rsvpStatus: 'accepted' | 'declined') {
        return this.database.execute({
            sql: `
                UPDATE MeetAttendee
                SET rsvpStatus = ?, respondedAt = CURRENT_TIMESTAMP
                WHERE meetId = ? AND accountId = ?
            `,
            args: [rsvpStatus, meetId, accountId],
        })
    }

    async getMeetAttendeeIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: 'SELECT accountId FROM MeetAttendee WHERE meetId = ?',
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetPersonIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: 'SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ?',
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetAttendedPersonIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: "SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ? AND attendanceStatus = 'attended'",
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getMeetPlayedGamePersonParticipants(meetId: number): Promise<Array<{ gameId: number; participantIds: Array<number> }>> {
        const resultSet = await this.database.execute({
            sql: `
                SELECT gameId, groupPersonId
                FROM MeetPersonGame
                WHERE meetId = ?
                ORDER BY gameId ASC, groupPersonId ASC
            `,
            args: [meetId],
        })

        const participantMap = new Map<number, Array<number>>()

        for (const row of resultSet.rows) {
            const gameId = Number(row[0])
            const participantIds = participantMap.get(gameId) ?? []

            participantIds.push(Number(row[1]))
            participantMap.set(gameId, participantIds)
        }

        return [...participantMap.entries()].map(([gameId, participantIds]) => ({ gameId, participantIds }))
    }

    getMeetPersonAttendeeForAccount(meetId: number, accountId: number) {
        return this.database.execute({
            sql: `
                SELECT mpa.meetId, mpa.groupPersonId, mpa.rsvpStatus, mpa.attendanceStatus, mpa.respondedAt, m.status
                FROM MeetPersonAttendee mpa
                INNER JOIN Meet m ON m.id = mpa.meetId
                INNER JOIN GroupPerson gp ON gp.id = mpa.groupPersonId
                WHERE mpa.meetId = ? AND gp.accountId = ?
            `,
            args: [meetId, accountId],
        })
    }

    updateMeetPersonAttendeeRsvp(meetId: number, groupPersonId: number, rsvpStatus: 'accepted' | 'declined') {
        return this.database.execute({
            sql: `
                UPDATE MeetPersonAttendee
                SET rsvpStatus = ?, respondedAt = CURRENT_TIMESTAMP
                WHERE meetId = ? AND groupPersonId = ?
            `,
            args: [rsvpStatus, meetId, groupPersonId],
        })
    }

    async getMeetAttendedAccountIds(meetId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: "SELECT accountId FROM MeetAttendee WHERE meetId = ? AND attendanceStatus = 'attended'",
            args: [meetId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async getDistinctCompletedMeetIdsForAccountHistory(accountId: number): Promise<Array<number>> {
        const resultSet = await this.database.execute({
            sql: `
                SELECT DISTINCT m.id
                FROM Meet m
                WHERE m.status = 'completed'
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM MeetAttendee ma
                          WHERE ma.meetId = m.id AND ma.accountId = ? AND ma.attendanceStatus = 'attended'
                      )
                      OR (
                          EXISTS (
                              SELECT 1
                              FROM MeetAccountGame mag
                              WHERE mag.meetId = m.id AND mag.accountId = ?
                          )
                          AND NOT EXISTS (
                              SELECT 1
                              FROM MeetAttendee ma
                              WHERE ma.meetId = m.id AND ma.accountId = ?
                          )
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM MeetPersonAttendee mpa
                          INNER JOIN GroupPerson gp ON gp.id = mpa.groupPersonId
                          WHERE mpa.meetId = m.id AND gp.accountId = ? AND mpa.attendanceStatus = 'attended'
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM MeetPersonGame mpg
                          INNER JOIN GroupPerson gp ON gp.id = mpg.groupPersonId
                          WHERE mpg.meetId = m.id AND gp.accountId = ?
                      )
                  )
                ORDER BY m.meetDate DESC, m.id DESC
            `,
            args: [accountId, accountId, accountId, accountId, accountId],
        })

        return resultSet.rows.map(row => Number(row[0]))
    }

    async updateMeetAttendance(meetId: number, attendedIds: Array<number>): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            const attendanceCondition = attendedIds.length === 0 ? '0' : `accountId IN (${attendedIds.map(() => '?').join(', ')})`

            await transaction.execute({
                sql: `
                    UPDATE MeetAttendee
                    SET attendanceStatus = CASE
                        WHEN ${attendanceCondition} THEN 'attended'
                        ELSE 'absent'
                    END
                    WHERE meetId = ?
                `,
                args: [...attendedIds, meetId],
            })
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateMeetPersonAttendance(meetId: number, attendedIds: Array<number>): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            const attendanceCondition = attendedIds.length === 0 ? '0' : `groupPersonId IN (${attendedIds.map(() => '?').join(', ')})`

            await transaction.execute({
                sql: `
                    UPDATE MeetPersonAttendee
                    SET attendanceStatus = CASE
                        WHEN ${attendanceCondition} THEN 'attended'
                        ELSE 'absent'
                    END
                    WHERE meetId = ?
                `,
                args: [...attendedIds, meetId],
            })
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async createCompletedSession(input: CompletedSessionInput) {
        const transaction = await this.database.transaction('write')

        try {
            const meetResult = await transaction.execute({
                sql: `
                INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)
                    VALUES (?, ?, ?, TRUE, 'completed', ?, ?, CURRENT_TIMESTAMP)
                `,
                args: [input.groupId, input.createdBy, input.sessionDate, input.timezone, input.notes ?? null],
            })
            const meetId = Number(meetResult.lastInsertRowid)
            const statements: Array<InStatement> = []

            for (const accountId of input.attendeeIds) {
                statements.push({
                    sql: `
                        INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                        VALUES (?, ?, 'accepted', 'attended')
                    `,
                    args: [meetId, accountId],
                })
            }

            for (const groupPersonId of input.groupPersonIds ?? []) {
                statements.push({
                    sql: `
                        INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus)
                        VALUES (?, ?, 'accepted', 'attended')
                    `,
                    args: [meetId, groupPersonId],
                })
            }

            for (const game of input.games) {
                statements.push({
                    sql: `
                        INSERT INTO MeetGame (meetId, gameId, gameStatus)
                        VALUES (?, ?, 'played')
                    `,
                    args: [meetId, game.gameId],
                })

                for (const accountId of game.participantIds) {
                    statements.push({
                        sql: `
                            INSERT OR IGNORE INTO MeetAccountGame (meetId, accountId, gameId)
                            VALUES (?, ?, ?)
                        `,
                        args: [meetId, accountId, game.gameId],
                    })
                }
            }

            for (const game of input.personGames ?? []) {
                for (const groupPersonId of game.participantIds) {
                    statements.push({
                        sql: `
                            INSERT OR IGNORE INTO MeetPersonGame (meetId, groupPersonId, gameId)
                            VALUES (?, ?, ?)
                        `,
                        args: [meetId, groupPersonId, game.gameId],
                    })
                }
            }

            await transaction.batch(statements)
            await transaction.commit()

            return { lastInsertRowid: meetId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async createScheduledSession(input: ScheduledSessionInput) {
        const transaction = await this.database.transaction('write')

        try {
            const meetResult = await transaction.execute({
                sql: `
                    INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)
                    VALUES (?, ?, ?, FALSE, 'scheduled', ?, ?, CURRENT_TIMESTAMP)
                `,
                args: [input.groupId, input.createdBy, input.sessionDate, input.timezone, input.notes ?? null],
            })
            const meetId = Number(meetResult.lastInsertRowid)
            const statements: Array<InStatement> = input.attendeeIds.map(accountId => ({
                sql: `
                    INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                    VALUES (?, ?, 'pending', 'unknown')
                `,
                args: [meetId, accountId],
            }))

            for (const groupPersonId of input.groupPersonIds ?? []) {
                statements.push({
                    sql: `
                        INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus)
                        VALUES (?, ?, 'pending', 'unknown')
                    `,
                    args: [meetId, groupPersonId],
                })
            }

            for (const gameId of input.plannedGameIds) {
                statements.push({
                    sql: `
                        INSERT INTO MeetGame (meetId, gameId, gameStatus)
                        VALUES (?, ?, 'planned')
                    `,
                    args: [meetId, gameId],
                })
            }

            await transaction.batch(statements)
            await transaction.commit()

            return { lastInsertRowid: meetId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    addGroupMembersToMeeting(meetId: number, groupId: number) {
        return this.database.execute({
            sql: `
            INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
            SELECT ?, gm.accountId
                , 'pending', 'unknown'
            FROM GroupMembership gm
            WHERE gm.groupId = ?;
            `,
            args: [meetId, groupId],
        })
    }

    createMeetAttendee(meetId: number, accountId: number) {
        return this.database.execute({
            sql: "INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (?, ?, 'pending', 'unknown')",
            args: [meetId, accountId],
        })
    }

    deleteMeetAttendee(meetId: number, accountId: number) {
        return this.database.execute({
            sql: 'DELETE FROM MeetAttendee WHERE meetId = ? AND accountId = ?',
            args: [meetId, accountId],
        })
    }

    async replaceMeetAttendees(meetId: number, accountIds: Array<number>, expectedStatus: 'scheduled' | 'active'): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return false
            }

            await transaction.execute({
                sql:
                    accountIds.length > 0
                        ? `DELETE FROM MeetAttendee WHERE meetId = ? AND accountId NOT IN (${accountIds.map(() => '?').join(', ')})`
                        : 'DELETE FROM MeetAttendee WHERE meetId = ?',
                args: accountIds.length > 0 ? [meetId, ...accountIds] : [meetId],
            })
            await transaction.batch(
                accountIds.map(accountId => ({
                    sql: `
                    INSERT OR IGNORE INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
                    VALUES (?, ?, 'pending', 'unknown')
                    `,
                    args: [meetId, accountId],
                })),
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

    async replaceMeetPersonAttendees(
        meetId: number,
        groupPersonIds: Array<number>,
        expectedStatus: 'scheduled' | 'active',
    ): Promise<boolean> {
        const transaction = await this.database.transaction('write')

        try {
            const statusGuard = await transaction.execute({
                sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
                args: [meetId, expectedStatus],
            })

            if (statusGuard.rowsAffected !== 1) {
                await transaction.commit()
                return false
            }

            await transaction.execute({
                sql:
                    groupPersonIds.length > 0
                        ? `DELETE FROM MeetPersonAttendee WHERE meetId = ? AND groupPersonId NOT IN (${groupPersonIds.map(() => '?').join(', ')})`
                        : 'DELETE FROM MeetPersonAttendee WHERE meetId = ?',
                args: groupPersonIds.length > 0 ? [meetId, ...groupPersonIds] : [meetId],
            })
            await transaction.batch(
                groupPersonIds.map(groupPersonId => ({
                    sql: `
                        INSERT OR IGNORE INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus)
                        VALUES (?, ?, 'pending', 'unknown')
                    `,
                    args: [meetId, groupPersonId],
                })),
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

    addGroupGamesToMeeting(meetId: number, groupId: number) {
        return this.database.execute({
            sql: `
            INSERT OR IGNORE INTO MeetGame (meetId, gameId)
            SELECT ?, og.gameId
            FROM OwnedGame og
            INNER JOIN GroupMembership gm ON og.accountId = gm.accountId
            WHERE gm.groupId = ?
            `,
            args: [meetId, groupId],
        })
    }

    queryMeetAccountGame(options: MeetAccountGameQueryOptions) {
        // Build SELECT clause
        let selectClause = '*'

        if (options.select && options.select.length > 0) {
            selectClause = options.select.join(', ')
        }

        if (options.distinct) {
            selectClause = `DISTINCT ${selectClause}`
        }

        // Build WHERE clause
        const whereConditions: string[] = []
        const args: number[] = []

        if (options.where) {
            if (options.where.meetId !== undefined) {
                whereConditions.push('meetId = ?')
                args.push(options.where.meetId)
            }

            if (options.where.accountId !== undefined) {
                whereConditions.push('accountId = ?')
                args.push(options.where.accountId)
            }

            if (options.where.gameId !== undefined) {
                whereConditions.push('gameId = ?')
                args.push(options.where.gameId)
            }
        }

        const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''
        const sql = `SELECT ${selectClause} FROM MeetAccountGame${whereClause}`

        return this.database.execute({ sql, args })
    }

    async createMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        const transaction = await this.database.transaction('write')

        try {
            await transaction.execute({
                sql: `
                    INSERT OR IGNORE INTO MeetGame (meetId, gameId, gameStatus)
                    VALUES (?, ?, 'played')
                `,
                args: [meetId, gameId],
            })
            await transaction.execute({
                sql: `
                    UPDATE MeetGame
                    SET gameStatus = 'played'
                    WHERE meetId = ? AND gameId = ?
                `,
                args: [meetId, gameId],
            })
            const result = await transaction.execute({
                sql: 'INSERT OR IGNORE INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
                args: [accountId, meetId, gameId],
            })

            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async deleteMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        const transaction = await this.database.transaction('write')

        try {
            const result = await transaction.execute({
                sql: 'DELETE FROM MeetAccountGame WHERE accountId = ? AND meetId = ? AND gameId = ?',
                args: [accountId, meetId, gameId],
            })

            await transaction.execute({
                sql: `
                    DELETE FROM MeetGame
                    WHERE meetId = ? AND gameId = ?
                      AND NOT EXISTS (
                          SELECT 1 FROM MeetAccountGame
                          WHERE meetId = ? AND gameId = ?
                      )
                `,
                args: [meetId, gameId, meetId, gameId],
            })
            await transaction.commit()
            return result
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async getPlayedGameParticipantIds(
        meetId: number,
        gameId: number,
    ): Promise<{ played: boolean; accountIds: Array<number>; personIds: Array<number> }> {
        const [game, accounts, people] = await Promise.all([
            this.database.execute({
                sql: "SELECT 1 FROM MeetGame WHERE meetId = ? AND gameId = ? AND gameStatus = 'played'",
                args: [meetId, gameId],
            }),
            this.database.execute({ sql: 'SELECT accountId FROM MeetAccountGame WHERE meetId = ? AND gameId = ?', args: [meetId, gameId] }),
            this.database.execute({
                sql: 'SELECT groupPersonId FROM MeetPersonGame WHERE meetId = ? AND gameId = ?',
                args: [meetId, gameId],
            }),
        ])

        return {
            played: game.rows.length > 0,
            accountIds: accounts.rows.map(row => Number(row[0])),
            personIds: people.rows.map(row => Number(row[0])),
        }
    }

    /** Replaces the results of one game in one transaction; an empty list clears them. */
    async replaceGameResults(meetId: number, gameId: number, results: Array<GameResultRow>): Promise<void> {
        const statements: Array<InStatement> = [
            { sql: 'DELETE FROM MeetGameResult WHERE meetId = ? AND gameId = ?', args: [meetId, gameId] },
            ...results.map(result => ({
                sql: 'INSERT INTO MeetGameResult (meetId, gameId, accountId, groupPersonId, isWinner, score) VALUES (?, ?, ?, ?, ?, ?)',
                args: [meetId, gameId, result.accountId, result.groupPersonId, result.isWinner ? 1 : 0, result.score],
            })),
        ]

        const transaction = await this.database.transaction('write')

        try {
            await transaction.batch(statements)
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }
}
