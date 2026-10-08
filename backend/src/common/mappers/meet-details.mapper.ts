import { toIsoDate } from '../utils/stored-date.js'

import type { GameDto } from '../types/game.type.js'
import type { MeetWithAttendeesAndGames } from '../types/meet.type.js'
import type { UserGetDto } from '../types/user.type.js'
import type { ResultSet } from '@libsql/client'

export function mapMeetDetailsResult(resultSet: ResultSet): MeetWithAttendeesAndGames | null {
    const row = resultSet.rows[0]

    if (!row) return null

    return {
        id: Number(row[0]),
        groupId: Number(row[1]),
        createdBy: Number(row[2]),
        meetDate: toIsoDate(String(row[3])),
        isConfirmed: Boolean(row[4]),
        attendees: JSON.parse(String(row[5])) as Array<UserGetDto['id']>,
        attendeeStatuses: JSON.parse(String(row[6])) as MeetWithAttendeesAndGames['attendeeStatuses'],
        playedGames: JSON.parse(String(row[7])) as Array<GameDto['id']>,
        plannedGames: JSON.parse(String(row[8])) as Array<GameDto['id']>,
        skippedGames: JSON.parse(String(row[9])) as Array<GameDto['id']>,
        playedGameParticipants: JSON.parse(String(row[10] ?? '[]')) as MeetWithAttendeesAndGames['playedGameParticipants'],
        status: String(row[11] ?? 'completed') as MeetWithAttendeesAndGames['status'],
        timezone: String(row[12] ?? 'UTC'),
        notes: row[13] == null ? null : String(row[13]),
        ...(row.length > 14
            ? {
                  participants: JSON.parse(String(row[14] ?? '[]')) as Array<number>,
                  participantStatuses: JSON.parse(String(row[15] ?? '[]')) as MeetWithAttendeesAndGames['participantStatuses'],
                  playedGamePersonParticipants: JSON.parse(
                      String(row[16] ?? '[]'),
                  ) as MeetWithAttendeesAndGames['playedGamePersonParticipants'],
              }
            : {}),
        gameResults: groupGameResults(row.length > 17 ? row[17] : null),
        // Filled by the sessions service, which reads votes separately.
        gameVotes: [],
        gameBringers: [],
    }
}

type GameResultRow = { gameId: number; accountId: number | null; groupPersonId: number | null; isWinner: number; score: number | null }

function groupGameResults(value: unknown): MeetWithAttendeesAndGames['gameResults'] {
    const rows = JSON.parse(String(value ?? '[]')) as Array<GameResultRow>
    const byGame = new Map<number, MeetWithAttendeesAndGames['gameResults'][number]['results']>()

    for (const row of rows) {
        byGame.set(row.gameId, [
            ...(byGame.get(row.gameId) ?? []),
            { accountId: row.accountId, groupPersonId: row.groupPersonId, isWinner: row.isWinner === 1, score: row.score },
        ])
    }
    return [...byGame.entries()].map(([gameId, results]) => ({ gameId, results }))
}
