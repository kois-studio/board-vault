import { intlLocale } from '../i18n/format'

/** "1 game", "3 games"; `plural` for words that don't just add an s. */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`
}

/**
 * How many can play: "2–4 players", or one number when both ends match ("2 players", "1 player").
 * `short` leaves out the word, for compact lines ("2–4", "2").
 */
export function playerRange(min: number, max: number, short = false): string {
    if (min === max) {
        if (short) return `${min}`
        return new Intl.PluralRules(intlLocale()).select(min) === 'one'
            ? $localize`:player count, one|How many can play a game, one number:${min}:count: player`
            : $localize`:player count, other|How many can play a game, one number:${min}:count: players`
    }
    return short ? `${min}–${max}` : $localize`:How many can play a game, a range such as 2–4:${min}:min:–${max}:max: players`
}
