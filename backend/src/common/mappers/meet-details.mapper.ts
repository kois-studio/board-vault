import type { GameDto } from '../types/game.type'
import type { MeetWithAttendeesAndGames } from '../types/meet.type'
import type { UserGetDto } from '../types/user.type'
import type { ResultSet } from '@libsql/client'

export function mapMeetDetailsResult(resultSet: ResultSet): MeetWithAttendeesAndGames | null {
    const row = resultSet.rows[0]

    if (!row) return null

    return {
        id: Number(row[0]),
        groupId: Number(row[1]),
        createdBy: Number(row[2]),
        meetDate: String(row[3]),
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
    }
}
