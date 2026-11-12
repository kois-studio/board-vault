/** The parts of a group the counts read: its people, and how many games it has, as the server counts them (#262). */
export type CountableGroup = {
    gameCount: number
    members: Array<unknown>
    placeholders?: Array<unknown>
}

/** Members plus people without an account. */
export function groupPeopleCount(group: CountableGroup): number {
    return group.members.length + (group.placeholders?.length ?? 0)
}

/** Distinct games owned by anyone in the group, members or people without an account. */
export function groupGameCount(group: CountableGroup): number {
    return group.gameCount
}
