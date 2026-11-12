import type { GameCompleteType, GameReviewDto, GroupOverviewType, GroupShelfType, PublicUserType } from '../../api/api.types'

/** A group as tests describe it: each person with the games they bring, members with their ratings. */
export type TestGroup = {
    id: number
    name: string
    createdBy: number
    createdAt: string
    members: Array<PublicUserType & { joinedAt: string; games: Array<GameCompleteType>; reviews?: Array<GameReviewDto> }>
    placeholders?: Array<{
        id: number
        displayName: string
        avatar: PublicUserType['avatar'] | null
        gameIds?: Array<number>
        games?: Array<GameCompleteType>
    }>
}

/** The overview and the shelf the API answers for such a group (#262). */
export function overviewAndShelf(group: TestGroup): { overview: GroupOverviewType; shelf: GroupShelfType } {
    const placeholders = (group.placeholders ?? []).map((person) => ({
        ...person,
        gameIds: person.gameIds ?? (person.games ?? []).map((game) => game.id),
    }))
    const games = new Map<number, GameCompleteType>()
    for (const member of group.members) for (const game of member.games) games.set(game.id, game)
    for (const person of placeholders) for (const game of person.games ?? []) games.set(game.id, game)
    const gameIds = new Set([
        ...group.members.flatMap((member) => member.games.map((game) => game.id)),
        ...placeholders.flatMap((person) => person.gameIds),
    ])

    return {
        overview: {
            id: group.id,
            name: group.name,
            createdBy: group.createdBy,
            createdAt: group.createdAt,
            gameCount: gameIds.size,
            members: group.members.map(({ games: owned, reviews: _reviews, ...member }) => ({ ...member, gameCount: owned.length })),
            placeholders: placeholders.map(({ gameIds: ids, games: _games, ...person }) => ({ ...person, gameCount: ids.length })),
        },
        shelf: {
            games: [...games.values()],
            owners: [
                ...group.members.map((member) => ({
                    accountId: member.id,
                    groupPersonId: null,
                    gameIds: member.games.map((game) => game.id),
                })),
                ...placeholders.map((person) => ({ accountId: null, groupPersonId: person.id, gameIds: person.gameIds })),
            ],
            // A spec may leave out whose rating it is: the member it sits under.
            reviews: group.members.flatMap((member) =>
                (member.reviews ?? []).map((review) => ({ ...review, accountId: review.accountId ?? member.id })),
            ),
        },
    }
}
