import type { GameCompleteDto } from '../types/game.type.js'

/** What a game carries for its title: the one the reader sees, its language, and the editions known (ADR-0025). */
export type GameTitleFields = Pick<GameCompleteDto, 'title' | 'titleLanguage' | 'titleTranslations'>

/**
 * The title fields for a query row that already resolved the reader's title (`resolvedTitleSql`). A game with no
 * edition gets an empty title in English, which the app shows as "Untitled game". Such a row knows one edition only,
 * so `titleTranslations` holds just that one.
 */
export function titleFieldsFromRow(title: unknown, language: unknown): GameTitleFields {
    const text = title === null || title === undefined ? '' : String(title)
    const titleLanguage = language === null || language === undefined ? 'en' : String(language)

    return { title: text, titleLanguage, titleTranslations: text ? { [titleLanguage]: text } : {} }
}
