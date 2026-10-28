import { pageLocale } from './format'
import { SUPPORTED_LOCALES } from './locales'

/** The interface languages come first in every language list; any other language is typed as a code. */
export const INTERFACE_LANGUAGE_CODES: ReadonlyArray<string> = SUPPORTED_LOCALES

/** The longest title an edition or an other title can have, as the API takes it. */
export const EDITION_TITLE_MAX_LENGTH = 200

const displayNames = new Map<string, Intl.DisplayNames | null>()

/** A language's name in the page's language ("alemán", "German"); the code itself when the browser does not know it. */
export function languageName(code: string): string {
    const locale = pageLocale()
    let names = displayNames.get(locale)
    if (names === undefined) {
        try {
            names = new Intl.DisplayNames([locale], { type: 'language' })
        } catch {
            names = null
        }
        displayNames.set(locale, names)
    }
    try {
        return names?.of(code) ?? code
    } catch {
        return code
    }
}

/**
 * The canonical form of a language code ("pt-br" becomes "pt-BR"), or null when it is not one the API
 * takes: two or three letters and an optional region. Mirrors the API's check.
 */
export function canonicalLanguageCode(value: string): string | null {
    try {
        const [canonical] = Intl.getCanonicalLocales(value.trim())
        return canonical && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(canonical) ? canonical : null
    } catch {
        return null
    }
}
