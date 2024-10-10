import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { GameOwnedDto } from '../../common/types/game-owned.type'
import { gameOwnedsSchema } from '../../common/schemas'

@Injectable()
export class GamesOwnedService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameOwnedDto> {
        const ownedGames = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
        }))

        const result = gameOwnedsSchema.safeParse(ownedGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse OwnedGames from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGamesOwneds() {
        this.LOGGER.log('Getting all ownedGames')
        const resultSet = await this.databaseService.getOwnedGames()

        return this._parseResultSet(resultSet)
    }

    async getGamesOwnedById(accountId: number, gameId: number): Promise<GameOwnedDto | NotFoundException> {
        this.LOGGER.log(`Getting ownedGame with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.getOwnedGameById(accountId, gameId)
        const ownedGames = this._parseResultSet(resultSet)

        if (ownedGames.length === 0) {
            return new NotFoundException(`OwnedGame with id ${accountId} ${gameId} not found`)
        }

        return ownedGames[0]
    }

    async createGamesOwned(ownedGameDto: GameOwnedDto) {
        this.LOGGER.log(`Creating ownedGame ${ownedGameDto.accountId} - ${ownedGameDto.gameId}`)
        try {
            await this.databaseService.createOwnedGame(ownedGameDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create ownedGame', error)
            return new InternalServerErrorException('Failed to create ownedGame')
        }
    }

    async deleteGamesOwnedById(accountId: number, gameId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting ownedGame with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.deleteOwnedGameById(accountId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`OwnedGame with id ${accountId} ${gameId} not found`)
        }

        return { success: true }
    }
}
