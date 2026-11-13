import { ResultSet } from '@libsql/client'
import { Injectable, Logger } from '@nestjs/common'

import { groupBy } from '../../../common/utils/group-by.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { type EditionTitle, editionTitlesSchema } from './game-titles.schema.js'
import { normalizeTitle } from './normalize-title.js'

import type { Locale } from '../../../common/i18n/locale.js'
import type { GameTitleFields } from '../../../common/utils/game-title.js'

/** Game titles, read from the games' editions (ADR-0025). */
@Injectable()
export class GameTitlesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<EditionTitle> {
        const titles = resultSet.rows.map(row => ({
            gameId: Number(row[0]),
            languageCode: String(row[1]),
            title: String(row[2]),
            normalizedTitle: String(row[3]),
        }))
        const result = editionTitlesSchema.safeParse(titles)

        if (!result.success) {
            this.LOGGER.error('Failed to parse edition titles from database')
            return []
        }

        return result.data
    }

    normalizeTitle(title: string): string {
        return normalizeTitle(title)
    }

    /** Every edition's title for many games in one query, keyed by game id, then by language code. */
    async getTitlesByLanguage(gameIds: Array<number>): Promise<Map<number, Record<string, string>>> {
        const uniqueIds = [...new Set(gameIds)]

        if (uniqueIds.length === 0) {
            return new Map()
        }

        const titles = this._parseResultSet(await this.databaseService.games.getEditionTitlesByGameIds(uniqueIds))
        // Each game's titles found at once, not by reading every title once per game (#289).
        const byGame = groupBy(titles, title => title.gameId)

        return new Map(
            uniqueIds.map(gameId => [
                gameId,
                Object.fromEntries((byGame.get(gameId) ?? []).map(edition => [edition.languageCode, edition.title])),
            ]),
        )
    }

    /** Each game's title for a reader (ADR-0025: their language, else the primary edition) and the language it is in. */
    async getResolvedTitles(gameIds: Array<number>, locale: Locale): Promise<Map<number, { title: string; titleLanguage: string }>> {
        const uniqueIds = [...new Set(gameIds)]

        if (uniqueIds.length === 0) return new Map()
        const result = await this.databaseService.games.getResolvedTitlesByGameIds(uniqueIds, locale)

        return new Map(
            result.rows.map(row => [
                Number(row[0]),
                { title: row[1] === null ? '' : String(row[1]), titleLanguage: row[2] === null ? 'en' : String(row[2]) },
            ]),
        )
    }

    /**
     * The games with `title` and `titleLanguage` resolved for the reader, and every edition's title in
     * `titleTranslations` (by language code), which the frontend's searches match against.
     */
    async withTitles<T extends { id: number }>(games: Array<T>, locale: Locale): Promise<Array<T & GameTitleFields>> {
        const ids = games.map(game => game.id)
        const [titles, resolved] = await Promise.all([this.getTitlesByLanguage(ids), this.getResolvedTitles(ids, locale)])

        return games.map(game => ({
            ...game,
            title: resolved.get(game.id)?.title ?? '',
            titleLanguage: resolved.get(game.id)?.titleLanguage ?? 'en',
            titleTranslations: titles.get(game.id) ?? {},
        }))
    }
}
