import { Injectable, Logger } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service.js'

/**
 * Nothing here is cached (#300): game pages, Browse and Administration read a game's tags straight
 * from the database, so a tag edit, merge or deletion needs no cache invalidation.
 */
@Injectable()
export class GameTagsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    async getGameCountByTagId(tagId: number): Promise<number> {
        this.LOGGER.log('Getting game count for tag')

        const resultSet = await this.databaseService.games.getGameCountByTagId(tagId)

        return Number(resultSet.rows[0]?.[0] ?? 0)
    }
}
