import type { ProposalOtherTitleType } from '../../../api/api.types'
import { canonicalLanguageCode, INTERFACE_LANGUAGE_CODES } from '../../../core/i18n/language-names'

/** The most other titles a proposal can list, as the API takes them. */
export const MAX_OTHER_TITLES = 10

/** One line of "Other known titles". `key` keeps a row's identity while others are added and removed. */
export type OtherTitleRow = { key: number; languageCode: string; title: string }

export type TitleProblem = 'title-language' | 'language' | 'duplicate'

let lastKey = 0

/** A new, empty row in the first interface language not used yet. */
export function addOtherTitle(rows: ReadonlyArray<OtherTitleRow>, titleLanguage: string): Array<OtherTitleRow> {
    const used = new Set([titleLanguage, ...rows.map((row) => row.languageCode)])
    lastKey += 1
    return [...rows, { key: lastKey, languageCode: INTERFACE_LANGUAGE_CODES.find((code) => !used.has(code)) ?? '', title: '' }]
}

/** Rows with no title are ignored, as they were never filled in. */
function filled(rows: ReadonlyArray<OtherTitleRow>): Array<OtherTitleRow> {
    return rows.filter((row) => row.title.trim() !== '')
}

/** What stops the proposal from being sent, in the API's own rules, or null. */
export function titleProblem(titleLanguage: string, rows: ReadonlyArray<OtherTitleRow>): TitleProblem | null {
    const own = canonicalLanguageCode(titleLanguage)
    if (!own) return 'title-language'
    const seen = new Set([own])
    for (const row of filled(rows)) {
        const language = canonicalLanguageCode(row.languageCode)
        if (!language) return 'language'
        if (seen.has(language)) return 'duplicate'
        seen.add(language)
    }
    return null
}

/** The other titles as the API takes them: blank rows left out, titles trimmed, languages canonical. */
export function otherTitlesBody(rows: ReadonlyArray<OtherTitleRow>): Array<ProposalOtherTitleType> {
    return filled(rows).map((row) => ({
        languageCode: canonicalLanguageCode(row.languageCode) ?? row.languageCode,
        title: row.title.trim(),
    }))
}
