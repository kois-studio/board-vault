import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { groupMembreshipsSchema } from '../../common/schemas'
import { CreateGroupMembershipBody, GroupMembershipDto } from '../../common/types/group-membership.type'

@Injectable()
export class GroupMembershipsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GroupMembershipDto> {
        const groupMemberships = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            groupId: String(row[1]),
            joinedAt: String(row[2]),
        }))

        const result = groupMembreshipsSchema.safeParse(groupMemberships)

        if (!result.success) {
            this.LOGGER.error('Failed to parse groupMemberships from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGroupMemberships(): Promise<Array<GroupMembershipDto>> {
        this.LOGGER.log('Getting all memberships')
        const resultSet = await this.databaseService.getGroupMemberships()

        return this._parseResultSet(resultSet)
    }

    async getGroupMembershipById(accountId: number, groupId: number): Promise<GroupMembershipDto | NotFoundException> {
        this.LOGGER.log(`Getting membership with id ${accountId} ${groupId}`)
        const resultSet = await this.databaseService.getGroupMembershipById(accountId, groupId)
        const memberships = this._parseResultSet(resultSet)

        if (memberships.length === 0) {
            return new NotFoundException(`Membership with id ${accountId} ${groupId} not found`)
        }

        return memberships[0]
    }

    async createGroupMembership(membershipDto: CreateGroupMembershipBody) {
        this.LOGGER.log(`Creating membership ${membershipDto.accountId} - ${membershipDto.groupId}`)
        try {
            await this.databaseService.createGroupMembership(membershipDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create membership', error)
            return new InternalServerErrorException('Failed to create membership')
        }
    }

    async deleteGroupMembershipById(accountId: number, groupId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting membership with id ${accountId} ${groupId}`)
        const resultSet = await this.databaseService.deleteGroupMembershipById(accountId, groupId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Membership with id ${accountId} ${groupId} not found`)
        }

        return { success: true }
    }
}
