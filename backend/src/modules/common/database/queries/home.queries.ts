import type { HomePreferencesDto } from '../../../../common/types/home.type.js'
import type { DatabaseService } from '../database.service.js'

export class HomeQueries {
    constructor(private readonly database: DatabaseService) {}

    async get(accountId: number): Promise<HomePreferencesDto> {
        const result = await this.database.execute({
            sql: 'SELECT preferences FROM AccountHomePreference WHERE accountId = ?',
            args: [accountId],
        })

        return result.rows[0]
            ? (JSON.parse(String(result.rows[0].preferences)) as HomePreferencesDto)
            : { pinnedGroupIds: [], groupOrder: 'recent', dismissedRatingGameIds: [] }
    }

    save(accountId: number, preferences: HomePreferencesDto) {
        return this.database.execute({
            sql: 'INSERT INTO AccountHomePreference (accountId, preferences) VALUES (?, ?) ON CONFLICT(accountId) DO UPDATE SET preferences = excluded.preferences',
            args: [accountId, JSON.stringify(preferences)],
        })
    }
}
