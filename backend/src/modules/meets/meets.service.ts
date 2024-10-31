import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { MeetDto } from '../../common/types/meet.type'
import { meetsSchema } from '../../common/schemas/db-meet.schema'

@Injectable()
export class MeetsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetDto> {
        const meets = resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            createdBy: Number(row[2]),
            createdAt: String(row[3]),
            isConfirmed: Boolean(row[4]),
            confirmedAt: row[5],
        }))

        console.log(meets, resultSet)
        const result = meetsSchema.safeParse(meets)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meets from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getMeets(): Promise<Array<MeetDto>> {
        this.LOGGER.log('Getting all meets')
        const resultSet = await this.databaseService.getMeets()

        return this._parseResultSet(resultSet)
    }

    async getMeetById(id: number): Promise<MeetDto> {
        this.LOGGER.log(`Getting meet with id ${id}`)
        const resultSet = await this.databaseService.getMeetById(id)
        const meets = this._parseResultSet(resultSet)

        if (meets.length === 0) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return meets[0]
    }
}
