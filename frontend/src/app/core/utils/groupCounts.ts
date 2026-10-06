/** The parts of a group the counts read: its members with their games, and its active people without an account. */
export type CountableGroup = {
    members: Array<{ games: Array<{ id: number }> }>
    placeholders?: Array<{ gameIds: Array<number> }>
}

/** Members plus people without an account. */
export function groupPeopleCount(group: CountableGroup): number {
    return group.members.length + (group.placeholders?.length ?? 0)
}

/** Distinct games owned by anyone in the group, members or people without an account. */
export function groupGameCount(group: CountableGroup): number {
    const ids = new Set(group.members.flatMap((member) => member.games.map((game) => game.id)))

    for (const person of group.placeholders ?? []) {
        for (const gameId of person.gameIds) ids.add(gameId)
    }

    return ids.size
}
