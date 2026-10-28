import { pageLocale } from '../i18n/format'
import { type Locale } from '../i18n/locales'

type EditionLike = { id: number; languageCode: string; isPrimary: boolean }

/** The first subtag of a language code: `pt` for `pt-BR`. */
const baseLanguage = (code: string): string => code.split('-')[0] ?? code

/**
 * The edition to preselect when someone says which one they own (ADR-0025): the edition in the page's language,
 * else the primary edition, else the first one. Null for a game with no editions.
 */
export function preselectedEdition<T extends EditionLike>(editions: ReadonlyArray<T>, locale: Locale = pageLocale()): T | null {
    return (
        editions.find((edition) => edition.languageCode === locale) ??
        editions.find((edition) => baseLanguage(edition.languageCode) === locale) ??
        editions.find((edition) => edition.isPrimary) ??
        editions[0] ??
        null
    )
}
