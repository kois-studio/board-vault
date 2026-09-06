import { ResultSet } from '@libsql/client/.'
import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gameOwnedsSchema } from '../../../common/schemas'
import { SuccessDto } from '../../../common/types/auth.type'
import { GameOwnedDto, UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class GamesOwnedService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameOwnedDto> {
        const ownedGames = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
            purchasePrice: row[2] ? Number(row[2]) : null,
            purchaseDate: row[3] ? String(row[3]) : null,
            purchaseNotes: row[4] ? String(row[4]) : null,
        }))

        return this._validateSchema(ownedGames)
    }

    private _validateSchema(ownedGames: Array<GameOwnedDto>): Array<GameOwnedDto> {
        const result = gameOwnedsSchema.safeParse(ownedGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse OwnedGames from database')
            return []
        }

        return result.data
    }

    // #region methods

    async getGamesOwneds() {
        this.LOGGER.log('Getting all ownedGames')
        const resultSet = await this.databaseService.getOwnedGames()

        return this._parseResultSet(resultSet)
    }

    async getGameOwnedByAccountIdAndGameId(accountId: number, gameId: number): Promise<GameOwnedDto> {
        this.LOGGER.log(`Getting ownedGame with accountId ${accountId} and gameId ${gameId}`)
        const resultSet = await this.databaseService.getGameOwnedByAccountIdAndGameId(accountId, gameId)

        const ownedGames = this._parseResultSet(resultSet)

        if (ownedGames.length === 0) {
            throw new NotFoundException(`OwnedGame with accountId ${accountId} and gameId ${gameId} not found`)
        }

        return ownedGames[0]
    }

    async getGamesOwnedByAccountId(accountId: number): Promise<Array<GameOwnedDto>> {
        this.LOGGER.log(`Getting ownedGames with accountId ${accountId}`)
        const resultSet = await this.databaseService.getOwnedGamesByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    // TODO: boolean? what is this method for?
    async isGameIdOwnedByAccountId(accountId: number, gameId: number, throwError = true): Promise<GameOwnedDto | null> {
        this.LOGGER.log(`Getting ownedGame with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.isGameIdOwnedByAccountId(accountId, gameId)
        const ownedGames = this._parseResultSet(resultSet)

        if (ownedGames.length === 0 && throwError) {
            throw new NotFoundException(`OwnedGame with id ${accountId} ${gameId} not found`)
        } else if (ownedGames.length === 0) {
            return null
        }

        return ownedGames[0]
    }

    async createGamesOwned(ownedGameDto: GameOwnedDto): Promise<SuccessDto> {
        this.LOGGER.log(`Creating ownedGame ${ownedGameDto.accountId} - ${ownedGameDto.gameId}`)
        try {
            await this.databaseService.createOwnedGame(ownedGameDto)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to create ownedGame')
            throw new HttpException(
                `OwnedGame with accountId ${ownedGameDto.accountId} and gameId ${ownedGameDto.gameId} already exists`,
                HttpStatus.CONFLICT,
            )
        }
    }

    async updateGameOwned(accountId: number, gameId: number, ownedGameDto: UpdateGameOwnedDto) {
        this.LOGGER.log(`Updating ownedGame with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.updateGameOwned(accountId, gameId, ownedGameDto)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`OwnedGame with id ${accountId} ${gameId} not found`)
        }

        return this.getGameOwnedByAccountIdAndGameId(accountId, gameId)
    }

    async deleteGamesOwnedById(accountId: number, gameId: number): Promise<SuccessDto> {
        this.LOGGER.log(`Deleting ownedGame with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.deleteOwnedGameById(accountId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`OwnedGame with accountId ${accountId} and gameId ${gameId} not found`)
        }

        return { success: true }
    }
}
