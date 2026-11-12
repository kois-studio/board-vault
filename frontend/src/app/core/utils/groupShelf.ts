import type { GameCompleteType, GroupOverviewType, GroupShelfType, GroupWithShelfType } from '../../api/api.types'

/**
 * A group's overview and its shelf together, shaped as the group with each person's games and the members'
 * ratings that pages about one group read (#262). Games stay in the shelf's order, by title.
 */
export function withShelf(group: GroupOverviewType, shelf: GroupShelfType): GroupWithShelfType {
    const games = new Map(shelf.games.map((game) => [game.id, game]))
    const gamesOf = (gameIds: Array<number>): Array<GameCompleteType> =>
        gameIds.map((id) => games.get(id)).filter((game): game is GameCompleteType => game !== undefined)
    const ownerOf = (accountId: number | null, groupPersonId: number | null) =>
        shelf.owners.find((owner) => owner.accountId === accountId && owner.groupPersonId === groupPersonId)?.gameIds ?? []

    return {
        ...group,
        members: group.members.map((member) => ({
            ...member,
            games: gamesOf(ownerOf(member.id, null)),
            reviews: shelf.reviews.filter((review) => review.accountId === member.id),
        })),
        placeholders: group.placeholders.map((person) => {
            const gameIds = ownerOf(null, person.id)
            return { ...person, gameIds, games: gamesOf(gameIds) }
        }),
    }
}
