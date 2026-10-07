import type { HistoryPersonDto, HistoryRecordDto, HistoryUserDto } from './play.types.js'
import type { GroupPersonStanding } from '../../../common/types/group-person.type.js'
import type { MeetDto } from '../../../common/types/meet.type.js'
import type { DatabaseService } from '../../common/database/database.service.js'
import type { GameTranslationService } from '../../core/game-translation/game-translation.service.js'
import type { GamesService } from '../../core/games/games.service.js'
import type { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service.js'
import type { UsersService } from '../../core/users/users.service.js'

export type HistoryRecordSources = {
    databaseService: DatabaseService
    gamesService: GamesService
    gameTranslationService: GameTranslationService
    usersService: UsersService
    meetAccountGamesService?: MeetAccountGamesService
}

/**
 * Builds history records for completed sessions with a fixed number of
 * queries: session details, games, translations, accounts, and group people
 * are each loaded once for the whole list.
 *
 * Everyone recorded stays in the record (ADR-0018): people who left the group
 * or deleted their account are kept, with their standing, so counts never change.
 */
export async function buildHistoryRecords(meets: Array<MeetDto>, sources: HistoryRecordSources): Promise<Array<HistoryRecordDto>> {
    if (meets.length === 0) {
        return []
    }

    const { databaseService, gamesService, gameTranslationService, usersService } = sources
    const details = await databaseService.sessions.getHistoryDetailsByMeetIds(meets.map(meet => meet.id))
    const sessions = meets.map(meet => {
        const gameIds = details.playedGameIds.get(meet.id) ?? []
        const personPlays = details.personPlays.get(meet.id) ?? []
        const accountPlays = details.accountPlays.get(meet.id) ?? []
        const winners = details.winners?.get(meet.id) ?? []

        return {
            meet,
            gameIds,
            attendedByIds: details.attendedAccountIds.get(meet.id) ?? [],
            attendedByPersonIds: details.attendedPersonIds.get(meet.id) ?? [],
            personParticipants: gameIds.map(gameId => ({
                gameId,
                participantIds: personPlays.filter(play => play.gameId === gameId).map(play => play.personId),
            })),
            winners,
            accountParticipants: new Map(
                gameIds.map(gameId => [gameId, accountPlays.filter(play => play.gameId === gameId).map(play => play.accountId)]),
            ),
        }
    })

    const groupIds = [...new Set(meets.map(meet => meet.groupId))]
    const gameIds = sessions.flatMap(session => session.gameIds)
    const accountIds = sessions.flatMap(session => [...session.attendedByIds, ...[...session.accountParticipants.values()].flat()])
    const [games, translations, users, peopleByGroup, accountStandings] = await Promise.all([
        gamesService.getGamesByIds(gameIds),
        gameTranslationService.getTranslationsByGameIds(gameIds),
        usersService.getPublicUsersByIds(accountIds),
        Promise.all(
            groupIds.map(async groupId => [groupId, peopleById(await databaseService.groups.getGroupPeople(groupId, true))] as const),
        ).then(entries => new Map(entries)),
        loadAccountStandings(databaseService, groupIds, [...new Set(accountIds)]),
    ])
    // Linked people keep their avatar on the account: load any linked account not already loaded (at most one query).
    const missingAccountIds = [
        ...new Set(
            [...peopleByGroup.values()]
                .flatMap(people => [...people.values()])
                .filter(person => person.avatar === null && person.accountId !== null && !users.has(person.accountId))
                .map(person => person.accountId as number),
        ),
    ]

    if (missingAccountIds.length > 0) {
        for (const [id, user] of await usersService.getPublicUsersByIds(missingAccountIds)) users.set(id, user)
    }

    const toPeople = (groupId: number, ids: Array<number>) =>
        ids
            .map(id => peopleByGroup.get(groupId)?.get(id))
            .filter((person): person is HistoryPersonDto => person !== undefined)
            .map(person => ({
                ...person,
                avatar: person.avatar ?? (person.accountId === null ? null : (users.get(person.accountId)?.avatar ?? null)),
            }))
    const toUsers = (groupId: number, ids: Array<number>): Array<HistoryUserDto> =>
        ids
            .map(id => users.get(id))
            .filter(user => user !== undefined)
            .map(user => ({ ...user, standing: accountStandings.get(`${groupId}:${user.id}`) ?? 'member' }))

    return sessions.map(session => ({
        meetData: session.meet,
        gamesPlayed: session.gameIds
            .filter(gameId => games.has(gameId))
            .map(gameId => ({
                gameData: { ...games.get(gameId)!, titleTranslations: translations.get(gameId) ?? { en: '', es: '' } },
                playedBy: toUsers(session.meet.groupId, session.accountParticipants.get(gameId) ?? []),
                playedByPeople: toPeople(
                    session.meet.groupId,
                    session.personParticipants.find(participants => participants.gameId === gameId)?.participantIds ?? [],
                ),
                winnerAccountIds: session.winners
                    .filter(winner => winner.gameId === gameId && winner.accountId !== null)
                    .map(winner => winner.accountId as number),
                winnerPersonIds: session.winners
                    .filter(winner => winner.gameId === gameId && winner.personId !== null)
                    .map(winner => winner.personId as number),
            })),
        attendedBy: toUsers(session.meet.groupId, session.attendedByIds),
        attendedByPeople: toPeople(session.meet.groupId, session.attendedByPersonIds),
    }))
}

function peopleById(groupPeople: Awaited<ReturnType<DatabaseService['groups']['getGroupPeople']>>): Map<number, HistoryPersonDto> {
    return new Map(
        groupPeople.rows.map(row => [
            Number(row[0]),
            {
                id: Number(row[0]),
                displayName: String(row[5]),
                avatar: parseAvatar(row[6]),
                accountId: row[2] === null || row[2] === undefined ? null : Number(row[2]),
                standing: String(row[10] ?? 'member') as GroupPersonStanding,
            },
        ]),
    )
}

/** Standing keyed by `groupId:accountId`; one query, and none without accounts. */
async function loadAccountStandings(
    databaseService: DatabaseService,
    groupIds: Array<number>,
    accountIds: Array<number>,
): Promise<Map<string, GroupPersonStanding>> {
    if (groupIds.length === 0 || accountIds.length === 0) return new Map()

    const result = await databaseService.groups.getAccountStandings(groupIds, accountIds)

    return new Map(result.rows.map(row => [`${Number(row.groupId)}:${Number(row.accountId)}`, String(row.standing) as GroupPersonStanding]))
}

export function parseAvatar(value: unknown) {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'object') return value
    try {
        return JSON.parse(String(value))
    } catch {
        return null
    }
}
