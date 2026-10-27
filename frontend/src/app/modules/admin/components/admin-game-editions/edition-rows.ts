import type { AbstractControl, ValidationErrors } from '@angular/forms'
import type { AdminEditionBodyType, AdminGameEditionType, AdminGameProposalType } from '../../../../api/api.types'
import { canonicalLanguageCode, EDITION_TITLE_MAX_LENGTH, INTERFACE_LANGUAGE_CODES } from '../../../../core/i18n/language-names'

/** One line of the editions list. `key` keeps a row's identity while others are added and removed. */
export type EditionRow = { key: number; languageCode: string; title: string; isPrimary: boolean }

let lastKey = 0

export function editionRow(languageCode: string, title: string, isPrimary: boolean): EditionRow {
    lastKey += 1
    return { key: lastKey, languageCode, title, isPrimary }
}

export function rowsFromEditions(
    editions: ReadonlyArray<Pick<AdminGameEditionType, 'languageCode' | 'title' | 'isPrimary'>>,
): Array<EditionRow> {
    return editions.map((edition) => editionRow(edition.languageCode, edition.title, edition.isPrimary))
}

/** What approving a proposal creates by default: its title in its language as the primary edition, then its other titles. */
export function rowsFromProposal(proposal: Pick<AdminGameProposalType, 'title' | 'titleLanguage' | 'otherTitles'>): Array<EditionRow> {
    return [
        editionRow(proposal.titleLanguage, proposal.title, true),
        ...proposal.otherTitles.map((other) => editionRow(other.languageCode, other.title, false)),
    ]
}

/** A new, empty row in the first interface language the game has no edition in; the first row is primary. */
export function addEdition(rows: ReadonlyArray<EditionRow>): Array<EditionRow> {
    const used = new Set(rows.map((row) => row.languageCode))
    const language = INTERFACE_LANGUAGE_CODES.find((code) => !used.has(code)) ?? ''
    return [...rows, editionRow(language, '', rows.length === 0)]
}

/** Removes a row. When it was the primary one, the first row left takes over. */
export function removeEdition(rows: ReadonlyArray<EditionRow>, key: number): Array<EditionRow> {
    const removed = rows.find((row) => row.key === key)
    const left = rows.filter((row) => row.key !== key)
    const first = left[0]
    return removed?.isPrimary && first ? left.map((row) => (row === first ? { ...row, isPrimary: true } : row)) : left
}

export function makePrimary(rows: ReadonlyArray<EditionRow>, key: number): Array<EditionRow> {
    return rows.map((row) => ({ ...row, isPrimary: row.key === key }))
}

export function updateEdition(
    rows: ReadonlyArray<EditionRow>,
    key: number,
    change: Partial<Pick<EditionRow, 'languageCode' | 'title'>>,
): Array<EditionRow> {
    return rows.map((row) => (row.key === key ? { ...row, ...change } : row))
}

/** The first problem with a set of editions, in the API's own rules, or null when it can be saved. */
export function editionsError(rows: ReadonlyArray<EditionRow>): string | null {
    if (rows.length === 0) return 'Add at least one edition.'
    const languages = new Set<string>()
    for (const row of rows) {
        const language = canonicalLanguageCode(row.languageCode)
        if (!language) return 'Every edition needs a language code such as de or pt-BR.'
        if (!row.title.trim()) return 'Every edition needs a title.'
        if (row.title.trim().length > EDITION_TITLE_MAX_LENGTH) return `Keep each title to ${EDITION_TITLE_MAX_LENGTH} characters.`
        if (languages.has(language)) return 'A game can have only one edition per language.'
        languages.add(language)
    }
    if (rows.filter((row) => row.isPrimary).length !== 1) return 'Choose one primary edition.'
    return null
}

/** The editions control's validator. */
export function editionsValidator(control: AbstractControl<ReadonlyArray<EditionRow>>): ValidationErrors | null {
    const message = editionsError(control.value)
    return message ? { editions: message } : null
}

/** The rows as the API takes them: titles trimmed, languages canonical. */
export function toEditionsBody(rows: ReadonlyArray<EditionRow>): Array<AdminEditionBodyType> {
    return rows.map((row) => ({
        languageCode: canonicalLanguageCode(row.languageCode) ?? row.languageCode.trim(),
        title: row.title.trim(),
        isPrimary: row.isPrimary,
    }))
}
