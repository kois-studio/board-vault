import { BadRequestException } from '@nestjs/common'

/** A language an edition can be in: two or three letters and an optional region ("de", "fil", "pt-BR"). */
const EDITION_LANGUAGE = /^[a-z]{2,3}(-[A-Z]{2})?$/

/** The longest title an edition can have, as on every other game title. */
export const EDITION_TITLE_MAX_LENGTH = 200

/**
 * The canonical form of an edition's language ("pt-br" becomes "pt-BR", "EN" becomes "en"), or null when
 * it is not a language code. Editions may be in any language, not only the interface languages (ADR-0025).
 */
export function canonicalEditionLanguage(value: unknown): string | null {
    if (typeof value !== 'string') return null

    try {
        const [canonical] = Intl.getCanonicalLocales(value.trim())

        return canonical && EDITION_LANGUAGE.test(canonical) ? canonical : null
    } catch {
        return null
    }
}

/** Like `canonicalEditionLanguage`, but a code that is not a language is a 400. */
export function requireEditionLanguage(value: unknown): string {
    const canonical = canonicalEditionLanguage(value)

    if (!canonical) throw new BadRequestException('Edition languages must be language codes such as "en", "de" or "pt-BR".')

    return canonical
}

export type EditionInput = { languageCode: string; title: string; isPrimary: boolean }

/**
 * Checks a game's full set of editions and returns it clean: titles trimmed and not empty, languages
 * canonical and unique, exactly one primary. Anything else is a 400.
 */
export function validateEditions(editions: ReadonlyArray<EditionInput>): Array<EditionInput> {
    if (editions.length === 0) throw new BadRequestException('A game needs at least one edition.')

    const seen = new Set<string>()
    const clean = editions.map(edition => {
        const languageCode = requireEditionLanguage(edition.languageCode)
        const title = typeof edition.title === 'string' ? edition.title.trim() : ''

        if (!title) throw new BadRequestException('Every edition needs a title.')
        if (title.length > EDITION_TITLE_MAX_LENGTH) {
            throw new BadRequestException(`Edition titles can have at most ${EDITION_TITLE_MAX_LENGTH} characters.`)
        }
        if (seen.has(languageCode)) throw new BadRequestException('A game can have only one edition per language.')
        seen.add(languageCode)

        return { languageCode, title, isPrimary: edition.isPrimary === true }
    })
    const primaries = clean.filter(edition => edition.isPrimary).length

    if (primaries !== 1) throw new BadRequestException('Exactly one edition must be the primary one.')

    return clean
}

/** Checks the other known titles of a proposal: canonical, unique, not the title's own language, not empty. */
export function validateOtherTitles(
    titleLanguage: string,
    otherTitles: ReadonlyArray<{ languageCode: string; title: string }>,
): Array<{ languageCode: string; title: string }> {
    const seen = new Set<string>([titleLanguage])

    return otherTitles.map(other => {
        const languageCode = requireEditionLanguage(other.languageCode)
        const title = typeof other.title === 'string' ? other.title.trim() : ''

        if (!title) throw new BadRequestException('Every other title needs a title.')
        if (seen.has(languageCode)) throw new BadRequestException('Each language can have only one title.')
        seen.add(languageCode)

        return { languageCode, title }
    })
}
