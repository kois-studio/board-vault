import type { HistoryPersonDto, HistoryRecordDto } from './play.types'
import type { MeetDto } from '../../../common/types/meet.type'
import type { DatabaseService } from '../../common/database/database.service'
import type { GameTranslationService } from '../../core/game-translation/game-translation.service'
import type { GamesService } from '../../core/games/games.service'
import type { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import type { UsersService } from '../../core/users/users.service'

export type HistoryRecordSources = {
    databaseService: DatabaseService
    gamesService: GamesService
    gameTranslationService: GameTranslationService
    usersService: UsersService
    meetAccountGamesService: MeetAccountGamesService
}

/**
 * Builds history records for completed sessions. Each session still reads its
 * own attendance and played games, but games, translations, accounts, and
 * group people are loaded once for the whole list.
 */
export async function buildHistoryRecords(meets: Array<MeetDto>, sources: HistoryRecordSources): Promise<Array<HistoryRecordDto>> {
    if (meets.length === 0) {
        return []
    }

    const { databaseService, gamesService, gameTranslationService, usersService, meetAccountGamesService } = sources
    const sessions = await Promise.all(
        meets.map(async meet => {
            const [attendedByIds, attendedByPersonIds, gameIds, personParticipants] = await Promise.all([
                databaseService.sessions.getMeetAttendedAccountIds(meet.id),
                databaseService.sessions.getMeetAttendedPersonIds(meet.id),
                databaseService.sessions.getPlayedGameIdsByMeetId(meet.id),
                databaseService.sessions.getMeetPlayedGamePersonParticipants(meet.id),
            ])
            const accountParticipants = new Map(
                await Promise.all(
                    gameIds.map(
                        async gameId =>
                            [gameId, await meetAccountGamesService.getDistinctAccountIdsByMeetIdAndGameId(meet.id, gameId)] as const,
                    ),
                ),
            )

            return { meet, attendedByIds, attendedByPersonIds, gameIds, personParticipants, accountParticipants }
        }),
    )

    const groupIds = [...new Set(meets.map(meet => meet.groupId))]
    const gameIds = sessions.flatMap(session => session.gameIds)
    const accountIds = sessions.flatMap(session => [...session.attendedByIds, ...[...session.accountParticipants.values()].flat()])
    const [games, translations, users, peopleByGroup] = await Promise.all([
        gamesService.getGamesByIds(gameIds),
        gameTranslationService.getTranslationsByGameIds(gameIds),
        usersService.getPublicUsersByIds(accountIds),
        Promise.all(
            groupIds.map(async groupId => [groupId, peopleById(await databaseService.groups.getGroupPeople(groupId))] as const),
        ).then(entries => new Map(entries)),
    ])
    const toPeople = (groupId: number, ids: Array<number>) =>
        ids.map(id => peopleByGroup.get(groupId)?.get(id)).filter((person): person is HistoryPersonDto => person !== undefined)
    const toUsers = (ids: Array<number>) => ids.map(id => users.get(id)).filter(user => user !== undefined)

    return sessions.map(session => ({
        meetData: session.meet,
        gamesPlayed: session.gameIds
            .filter(gameId => games.has(gameId))
            .map(gameId => ({
                gameData: { ...games.get(gameId)!, titleTranslations: translations.get(gameId) ?? { en: '', es: '' } },
                playedBy: toUsers(session.accountParticipants.get(gameId) ?? []),
                playedByPeople: toPeople(
                    session.meet.groupId,
                    session.personParticipants.find(participants => participants.gameId === gameId)?.participantIds ?? [],
                ),
            })),
        attendedBy: toUsers(session.attendedByIds),
        attendedByPeople: toPeople(session.meet.groupId, session.attendedByPersonIds),
    }))
}

function peopleById(groupPeople: Awaited<ReturnType<DatabaseService['groups']['getGroupPeople']>>): Map<number, HistoryPersonDto> {
    return new Map(
        groupPeople.rows.map(row => [Number(row[0]), { id: Number(row[0]), displayName: String(row[5]), avatar: parseAvatar(row[6]) }]),
    )
}

function parseAvatar(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'object') return value
    try {
        return JSON.parse(String(value))
    } catch {
        return null
    }
}
