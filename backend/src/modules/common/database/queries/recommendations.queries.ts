import type { DatabaseService } from '../database.service.js'

/** Game recommendation candidates and feedback. */
export class RecommendationQueries {
    constructor(private readonly database: DatabaseService) {}

    getOwnedGameByAnyAccount(gameId: number, accountIds: Array<number>) {
        const placeholders = accountIds.map(() => '?').join(', ')

        return this.database.execute({
            sql: `SELECT 1 FROM OwnedGame WHERE gameId = ? AND accountId IN (${placeholders}) LIMIT 1`,
            args: [gameId, ...accountIds],
        })
    }

    getRecommendationCandidateCounts(attendeeIds: Array<number>, playerCount: number, availableMinutes?: number) {
        const placeholders = attendeeIds.map(() => '?').join(', ')
        const durationExpression = availableMinutes === undefined ? '1' : '(g.gameAvgDuration IS NULL OR g.gameAvgDuration <= ?)'
        const args: Array<number> = [playerCount, playerCount, playerCount, playerCount]

        if (availableMinutes !== undefined) args.push(availableMinutes)
        args.push(...attendeeIds)

        return this.database.execute({
            sql: `
                SELECT
                    COUNT(DISTINCT g.id) AS ownedGameCount,
                    COUNT(DISTINCT CASE WHEN (g.minPlayers IS NULL OR g.minPlayers <= ?)
                        AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?) THEN g.id END) AS playerFitCount,
                    COUNT(DISTINCT CASE WHEN (g.minPlayers IS NULL OR g.minPlayers <= ?)
                        AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?)
                        AND ${durationExpression} THEN g.id END) AS durationFitCount
                FROM Game g
                INNER JOIN OwnedGame og ON og.gameId = g.id
                    AND og.accountId IN (${placeholders})
            `,
            args,
        })
    }

    createRecommendationFeedback(input: {
        accountId: number
        groupId: number
        gameId: number
        attendeeIds: string
        feedback: 'interested' | 'not_for_us' | 'played'
    }) {
        return this.database.execute({
            sql: `
                INSERT INTO RecommendationFeedback (accountId, groupId, gameId, attendeeIds, feedback)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [input.accountId, input.groupId, input.gameId, input.attendeeIds, input.feedback],
        })
    }

    createParticipantRecommendationFeedback(input: {
        accountId: number
        groupId: number
        gameId: number
        participantIds: string
        feedback: 'interested' | 'not_for_us' | 'played'
    }) {
        return this.database.execute({
            sql: `
                INSERT INTO RecommendationFeedbackParticipant (accountId, groupId, gameId, participantIds, feedback)
                VALUES (?, ?, ?, ?, ?)
            `,
            args: [input.accountId, input.groupId, input.gameId, input.participantIds, input.feedback],
        })
    }

    getParticipantRecommendationFeedbackForGroup(groupId: number) {
        return this.database.execute({
            sql: `
                SELECT id, gameId, accountId, participantIds, feedback, createdAt
                FROM RecommendationFeedbackParticipant
                WHERE groupId = ?
                ORDER BY createdAt DESC, id DESC
            `,
            args: [groupId],
        })
    }

    getRecommendationFeedbackForGroup(groupId: number) {
        return this.database.execute({
            sql: `
                SELECT
                    rf.id,
                    rf.gameId,
                    rf.accountId,
                    rf.feedback,
                    rf.createdAt,
                    a.username,
                    a.displayName,
                    a.avatar
                FROM RecommendationFeedback rf
                INNER JOIN GroupMembership gm
                    ON gm.groupId = rf.groupId AND gm.accountId = rf.accountId
                INNER JOIN Account a ON a.id = rf.accountId AND a.isDeleted = FALSE
                WHERE rf.groupId = ?
                ORDER BY rf.createdAt DESC, rf.id DESC
            `,
            args: [groupId],
        })
    }

    getRecommendationCandidates(attendeeIds: Array<number>, playerCount: number, availableMinutes?: number) {
        const attendeePlaceholders = attendeeIds.map(() => '?').join(', ')
        const durationFilter = availableMinutes === undefined ? '' : 'AND (g.gameAvgDuration IS NULL OR g.gameAvgDuration <= ?)'
        const args: Array<number> = [...attendeeIds, playerCount, playerCount]

        if (availableMinutes !== undefined) {
            args.push(availableMinutes)
        }

        return this.database.execute({
            sql: `
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    gt_en.title,
                    gt_es.title,
                    (
                        SELECT COUNT(DISTINCT og.accountId)
                        FROM OwnedGame og
                        WHERE og.gameId = g.id AND og.accountId IN (${attendeePlaceholders})
                    ) AS ownerCount,
                    (
                        SELECT AVG(gr.review)
                        FROM GameReview gr
                        WHERE gr.gameId = g.id AND gr.accountId IN (${attendeePlaceholders})
                    ) AS averageReview,
                    (
                        SELECT MAX(m.meetDate)
                        FROM MeetGame mg
                        INNER JOIN Meet m ON m.id = mg.meetId
                        WHERE mg.gameId = g.id
                          AND mg.gameStatus = 'played'
                          AND m.status = 'completed'
                          AND (
                              EXISTS (
                                  SELECT 1
                                  FROM MeetAttendee ma
                                  WHERE ma.meetId = m.id
                                    AND ma.accountId IN (${attendeePlaceholders})
                                    AND ma.attendanceStatus = 'attended'
                              )
                              OR EXISTS (
                                  SELECT 1
                                  FROM MeetAccountGame mag
                                  WHERE mag.meetId = m.id
                                    AND mag.gameId = g.id
                                    AND mag.accountId IN (${attendeePlaceholders})
                              )
                          )
                    ) AS lastPlayedAt
                FROM Game g
                INNER JOIN OwnedGame ownedByAttendee
                    ON ownedByAttendee.gameId = g.id
                   AND ownedByAttendee.accountId IN (${attendeePlaceholders})
                LEFT JOIN GameTranslation gt_en
                    ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es
                    ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                WHERE (g.minPlayers IS NULL OR g.minPlayers <= ?)
                  AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?)
                  AND COALESCE(gt_en.title, gt_es.title) IS NOT NULL
                  ${durationFilter}
                GROUP BY g.id
            `,
            args: [...attendeeIds, ...attendeeIds, ...attendeeIds, ...attendeeIds, ...attendeeIds, ...args.slice(attendeeIds.length)],
        })
    }

    getGroupPersonRecommendationCandidates(groupId: number, groupPersonIds: Array<number>, playerCount: number, availableMinutes?: number) {
        const personPlaceholders = groupPersonIds.map(() => '?').join(', ')
        const durationFilter = availableMinutes === undefined ? '' : 'AND (g.gameAvgDuration IS NULL OR g.gameAvgDuration <= ?)'
        const args: Array<number> = [groupId, ...groupPersonIds, playerCount, playerCount]

        if (availableMinutes !== undefined) args.push(availableMinutes)

        return this.database.execute({
            sql: `
                WITH selected_people AS (
                    SELECT id, accountId
                    FROM GroupPerson
                    WHERE groupId = ?
                      AND status = 'active'
                      AND id IN (${personPlaceholders})
                ), available_games AS (
                    SELECT sp.id AS groupPersonId, og.gameId
                    FROM selected_people sp
                    INNER JOIN OwnedGame og ON og.accountId = sp.accountId
                    WHERE sp.accountId IS NOT NULL
                    UNION
                    SELECT o.groupPersonId, o.gameId
                    FROM GroupPersonGameOwnership o
                    INNER JOIN selected_people sp ON sp.id = o.groupPersonId
                    WHERE o.status = 'asserted'
                )
                SELECT
                    g.id,
                    g.imageUrl,
                    g.gameAvgDuration,
                    g.minPlayers,
                    g.maxPlayers,
                    gt_en.title,
                    gt_es.title,
                    COUNT(DISTINCT available_games.groupPersonId) AS ownerCount,
                    (
                        SELECT AVG(gr.review)
                        FROM GameReview gr
                        INNER JOIN selected_people reviewPerson ON reviewPerson.accountId = gr.accountId
                        WHERE gr.gameId = g.id AND reviewPerson.accountId IS NOT NULL
                    ) AS averageReview,
                    (
                        SELECT MAX(m.meetDate)
                        FROM MeetGame mg
                        INNER JOIN Meet m ON m.id = mg.meetId
                        WHERE mg.gameId = g.id
                          AND mg.gameStatus = 'played'
                          AND m.status = 'completed'
                          AND EXISTS (
                              SELECT 1
                              FROM MeetAccountGame mag
                              INNER JOIN selected_people playedPerson ON playedPerson.accountId = mag.accountId
                              WHERE mag.meetId = m.id AND mag.gameId = g.id AND playedPerson.accountId IS NOT NULL
                          )
                    ) AS lastPlayedAt,
                    COALESCE((
                        SELECT SUM(CASE p.preference
                            WHEN 'favorite' THEN 2
                            WHEN 'like' THEN 1
                            WHEN 'avoid' THEN -2
                            ELSE 0
                        END)
                        FROM GroupPersonGamePreference p
                        INNER JOIN selected_people preferencePerson ON preferencePerson.id = p.groupPersonId
                        WHERE p.gameId = g.id
                    ), 0) AS preferenceScore
                FROM Game g
                INNER JOIN available_games ON available_games.gameId = g.id
                LEFT JOIN GameTranslation gt_en ON gt_en.gameId = g.id AND gt_en.languageCode = 'en'
                LEFT JOIN GameTranslation gt_es ON gt_es.gameId = g.id AND gt_es.languageCode = 'es'
                WHERE (g.minPlayers IS NULL OR g.minPlayers <= ?)
                  AND (g.maxPlayers IS NULL OR g.maxPlayers >= ?)
                  AND COALESCE(gt_en.title, gt_es.title) IS NOT NULL
                  ${durationFilter}
                GROUP BY g.id
            `,
            args,
        })
    }
}
