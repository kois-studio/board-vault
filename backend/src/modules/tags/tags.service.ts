import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { TagDto } from '../../common/types/tag.type'
import { tagsSchema } from '../../common/schemas/db-tag.schema'

@Injectable()
export class TagsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<TagDto> {
        const tags = resultSet.rows.map(row => ({
            tag: String(row[0]),
            category: String(row[1]),
        }))

        const result = tagsSchema.safeParse(tags)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Tags from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGameTags(gameId: number): Promise<Array<TagDto>> {
        this.LOGGER.log(`Getting tags for game ${gameId}`)
        const resultSet = await this.databaseService.getGameTags(gameId)

        return this._parseResultSet(resultSet)
    }
}
