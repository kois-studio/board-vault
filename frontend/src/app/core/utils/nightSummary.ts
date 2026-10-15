import type { MeetWithAttendeesAndGamesType } from '../../api/api.types'

export type NightSummary = {
    /** Invited and going. */
    going: number
    /** Invited accounts that have not answered; group people without an account never answer. */
    waiting: number
    /** The shortlist, most-voted first; ties keep the order games were added (as on the night page). */
    shortlist: Array<{ gameId: number; votes: number }>
}

/** What a game night card says about a night: who is coming and what the group leans towards. */
export function summariseNight(
    night: Pick<MeetWithAttendeesAndGamesType, 'attendeeStatuses' | 'participants' | 'participantStatuses' | 'plannedGames' | 'gameVotes'>,
): NightSummary {
    // A night of group people invites people, not accounts (the night page's rule).
    const byPeople = (night.participants?.length ?? 0) > 0
    const going = byPeople
        ? (night.participantStatuses ?? []).filter((status) => status.rsvpStatus === 'accepted').length
        : night.attendeeStatuses.filter((status) => status.rsvpStatus === 'accepted').length
    const waiting = byPeople ? 0 : night.attendeeStatuses.filter((status) => status.rsvpStatus === 'pending').length

    const votes = new Map(night.gameVotes.map((entry) => [entry.gameId, entry.accountIds.length]))
    const shortlist = night.plannedGames
        .map((gameId, index) => ({ gameId, votes: votes.get(gameId) ?? 0, index }))
        .sort((a, b) => b.votes - a.votes || a.index - b.index)
        .map(({ gameId, votes }) => ({ gameId, votes }))

    return { going, waiting, shortlist }
}
