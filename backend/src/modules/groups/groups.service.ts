import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CreateGroupBody, GroupDto, UpdateGroupBody } from '../../common/types/shared/group.type'
import { DatabaseService } from '../database/database.service'
import { groupsSchema } from '../../common/schemas'

@Injectable()
export class GroupsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GroupDto> {
        const groups = resultSet.rows.map(row => ({
            id: Number(row[0]),
            name: String(row[1]),
            createdBy: Number(row[2]),
            createdAt: String(row[3]),
            is_deleted: Boolean(row[4]),
        }))

        const result = groupsSchema.safeParse(groups)

        if (!result.success) {
            this.LOGGER.error('Failed to parse groups from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGroups(): Promise<Array<GroupDto>> {
        this.LOGGER.log('Getting all users')
        const resultSet = await this.databaseService.getGroups()

        return this._parseResultSet(resultSet)
    }

    async getGroupById(id: number): Promise<GroupDto | NotFoundException> {
        this.LOGGER.log(`Getting group with id ${id}`)
        const resultSet = await this.databaseService.getGroupById(id)
        const groups = this._parseResultSet(resultSet)

        if (groups.length === 0) {
            return new NotFoundException(`Group with id ${id} not found`)
        }

        return groups[0]
    }

    async createGroup(groupBody: CreateGroupBody) {
        this.LOGGER.log(`Creating user ${groupBody.name} - by ${groupBody.createdBy}`)
        await this.databaseService.createGroup(groupBody)

        return { success: true }
    }

    // TODO: check responses here
    deleteGroupById(id: number): Promise<ResultSet> {
        this.LOGGER.log(`Deleting user with id ${id}`)
        return this.databaseService.softDeleteGroupById(id)
    }

    updateGroup(id: number, partialGroupDto: UpdateGroupBody): Promise<ResultSet> {
        this.LOGGER.log(`Updating group with id ${id}`)
        return this.databaseService.updateGroup(id, partialGroupDto)
    }
}
