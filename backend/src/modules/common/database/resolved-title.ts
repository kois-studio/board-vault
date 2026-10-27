import { DEFAULT_LOCALE, isSupportedLocale } from '../../../common/i18n/locale.js'

/** SQL for a game's title as a reader sees it, and the language of that title (null when the game has no edition). */
export type ResolvedTitleSql = {
    /** The edition in the reader's language, else the primary edition. */
    title: string
    /** The language code of `title`. */
    language: string
    /** `title`'s normalized form, for sorting the way the reader sees titles. */
    normalizedTitle: string
}

/**
 * ADR-0025's rule for which title a game shows: the edition in the reader's interface language, then the
 * primary edition, then (for a game with no primary) any edition by language code. `gameId` is a SQL
 * expression such as `g.id`. The locale is checked against the supported languages and written into the
 * SQL as a literal, so no argument has to be threaded through a query's placeholders.
 */
export function resolvedTitleSql(gameId: string, locale: string): ResolvedTitleSql {
    const language = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE
    const pick = (column: string) =>
        `(SELECT rt.${column} FROM GameEdition rt WHERE rt.gameId = ${gameId} ORDER BY rt.languageCode = '${language}' DESC, rt.isPrimary DESC, rt.languageCode ASC LIMIT 1)`

    return { title: pick('title'), language: pick('languageCode'), normalizedTitle: pick('normalizedTitle') }
}

/**
 * ADR-0025's rule 1, for a row that is someone's copy of a game: the title of the edition they said they own
 * (`OwnedGame.editionId`), else rule 2 (`resolvedTitleSql`). `ownedGame` is the alias of the `OwnedGame` row in the
 * query (such as `og`) and `gameId` a SQL expression for its game.
 */
export function ownedTitleSql(ownedGame: string, gameId: string, locale: string): ResolvedTitleSql {
    const resolved = resolvedTitleSql(gameId, locale)
    const owned = (column: string, fallback: string) =>
        `COALESCE((SELECT oe.${column} FROM GameEdition oe WHERE oe.id = ${ownedGame}.editionId AND oe.gameId = ${gameId}), ${fallback})`

    return {
        title: owned('title', resolved.title),
        language: owned('languageCode', resolved.language),
        normalizedTitle: owned('normalizedTitle', resolved.normalizedTitle),
    }
}
