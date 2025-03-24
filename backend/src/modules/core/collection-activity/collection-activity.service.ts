import { ResultSet } from '@libsql/client/.'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { collectionActivitiesSchema } from '../../../common/schemas/db-collection-activity.schema'
import { CollectionActivityDto } from '../../../common/types/collection-activity.type'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class CollectionActivityService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'collection-activity'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<CollectionActivityDto> {
        const collectionActivities = resultSet.rows.map(row => ({
            id: Number(row[0]),
            accountId: Number(row[1]),
            gameId: Number(row[2]),
            actionType: String(row[3]) as CollectionActivityDto['actionType'],
            actionDetails: JSON.parse(String(row[4])),
            createdAt: String(row[5]),
        }))

        return this._validateSchema(collectionActivities)
    }

    private _validateSchema(collectionActivities: Array<CollectionActivityDto>): Array<CollectionActivityDto> {
        const result = collectionActivitiesSchema.safeParse(collectionActivities)

        if (!result.success) {
            this.LOGGER.error('Failed to parse CollectionActivity from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getUserCollectionActivities(accountId: number): Promise<Array<CollectionActivityDto>> {
        this.LOGGER.log(`Getting collection activities for account ${accountId}`)

        // Step 1: Try to get them from cache
        const cachedCollectionActivities = await this.cacheService.get(`${this.CACHE_KEY}:byAccountId:${accountId}`)

        if (cachedCollectionActivities) {
            this.LOGGER.log(`Returning cached collection activities for account ${accountId}`)
            return this._validateSchema(cachedCollectionActivities)
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getUserCollectionActivities(accountId)
        const collectionActivities = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byAccountId:${accountId}`, collectionActivities)

        return collectionActivities
    }

    async logCollectionActivity(
        accountId: number,
        gameId: number,
        actionType: CollectionActivityDto['actionType'],
        actionDetails: CollectionActivityDto['actionDetails'],
    ) {
        this.LOGGER.log(`Logging collection activity for account ${accountId} and game ${gameId}`)

        const loggedActivities = await this.getUserCollectionActivities(accountId)

        if (loggedActivities.length >= 32) {
            // The [0] is the oldest because SQLite returns sorted by id ascending
            const oldestId = loggedActivities[0].id

            await this.databaseService.deleteCollectionActivityById(oldestId)
        }

        try {
            const collectionActivity: Omit<CollectionActivityDto, 'id'> = {
                accountId,
                gameId,
                actionType,
                actionDetails,
                createdAt: new Date().toISOString(),
            }

            const result = await this.databaseService.createCollectionActivity(collectionActivity)

            if (result.rowsAffected === 0) {
                throw new BadRequestException('Failed to log collection activity')
            }

            // Clear cache
            await this.cacheService.deleteOne(`${this.CACHE_KEY}:byAccountId:${accountId}`)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to log collection activity', error)
            throw new BadRequestException('Failed to log collection activity')
        }
    }
}
