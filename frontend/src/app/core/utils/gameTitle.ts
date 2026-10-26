import { pageLocale } from '../i18n/format'
import type { Locale } from '../i18n/locales'

type TitledGame = { title?: string | null; titleTranslations?: Partial<Record<string, string | null>> | null }

/**
 * A game's title in the page's language when the catalogue has that edition's title, else its English
 * title, else its stored title, else "Untitled game" (ADR-0025). Show every game title through this,
 * never `titleTranslations.en`, so a Spanish page says "Código Secreto".
 */
export function gameTitle(game: TitledGame, locale: Locale = pageLocale()): string {
    return (
        game.titleTranslations?.[locale] ||
        game.titleTranslations?.['en'] ||
        game.title ||
        $localize`:Shown for a game the catalogue has no title for:Untitled game`
    )
}

/**
 * The language of the title `gameTitle` shows, when it differs from the page's, for a `lang` attribute
 * so a screen reader pronounces it right; null when the title is in the page's language or unknown.
 */
export function gameTitleLanguage(game: TitledGame, locale: Locale = pageLocale()): string | null {
    if (game.titleTranslations?.[locale]) return null
    if (game.titleTranslations?.['en']) return locale === 'en' ? null : 'en'
    return null
}

/** The game's other titles (the editions not shown by `gameTitle`), each with its language, for "also known as". */
export function otherGameTitles(game: TitledGame, locale: Locale = pageLocale()): Array<{ title: string; lang: string }> {
    const shown = gameTitle(game, locale)
    const seen = new Set([shown])
    return Object.entries(game.titleTranslations ?? {}).flatMap(([lang, title]) => {
        if (!title || seen.has(title)) return []
        seen.add(title)
        return [{ title, lang }]
    })
}
