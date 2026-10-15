/** "1 game", "3 games"; `plural` for words that don't just add an s. */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`
}

/**
 * How many can play: "2–4 players", or one number when both ends match ("2 players", "1 player").
 * `short` leaves out the word, for compact lines ("2–4", "2").
 */
export function playerRange(min: number, max: number, short = false): string {
    if (min === max) return short ? `${min}` : countOf(min, 'player')
    return short ? `${min}–${max}` : `${min}–${max} players`
}
