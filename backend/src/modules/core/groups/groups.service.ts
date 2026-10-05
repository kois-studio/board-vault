import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { groupsSchema } from '../../../common/schemas/index.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { CreateGroupBody, GroupDto, UpdateGroupBody } from '../../../common/types/group.type.js'
import type { InvitationWithAccountsData } from '../../../common/types/invitation.type.js'
import type { AvatarDto, UserPublicDto } from '../../../common/types/user.type.js'

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
        }))

        return this._validateSchema(groups)
    }

    private _validateSchema(groups: Array<GroupDto>): Array<GroupDto> {
        const result = groupsSchema.safeParse(groups)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Groups from database')
            return []
        }

        return result.data
    }

    // #region methods

    async getGroupsForAccount(accountId: number): Promise<Array<GroupDto>> {
        this.LOGGER.log('Getting groups for account')
        const resultSet = await this.databaseService.groups.getGroupsForAccount(accountId)

        return this._parseResultSet(resultSet)
    }

    async getGroupById(id: number): Promise<GroupDto> {
        this.LOGGER.log('Getting group by id')
        const resultSet = await this.databaseService.groups.getGroupById(id)
        const groups = this._parseResultSet(resultSet)

        const [group] = groups

        if (!group) {
            throw new NotFoundException(`Group with id ${id} not found`)
        }

        return group
    }

    async getGroupByName(name: string): Promise<GroupDto> {
        this.LOGGER.log('Getting group by name')
        const resultSet = await this.databaseService.groups.getGroupByName(name)
        const groups = this._parseResultSet(resultSet)

        const [group] = groups

        if (!group) {
            throw new NotFoundException(`Group with name ${name} not found`)
        }

        return group
    }

    async createGroup(groupBody: CreateGroupBody) {
        this.LOGGER.log('Creating group')
        try {
            await this.databaseService.groups.createGroup(groupBody)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to create group')
            throw new NotFoundException('User not found')
        }
    }

    async deleteGroupById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting group')
        const resultSet = await this.databaseService.groups.deleteGroupById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Group with id ${id} not found`)
        }

        return { success: true }
    }

    async updateGroup(id: number, partialGroupDto: UpdateGroupBody): Promise<{ success: boolean }> {
        this.LOGGER.log('Updating group')
        const resultSet = await this.databaseService.groups.updateGroup(id, partialGroupDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`Group with id ${id} not found`)
        }

        return { success: true }
    }

    async getGroupInvitations(groupId: number): Promise<Array<InvitationWithAccountsData>> {
        this.LOGGER.log('Getting all invitations for group')
        const resultSet = await this.databaseService.invitations.getGroupInvitations(groupId)

        return resultSet.rows
            .map(row => ({
                id: Number(row[0]),
                groupId: Number(row[1]),
                fromAccountId: Number(row[2]),
                toAccountId: Number(row[3]),
                sentAt: String(row[4]),
                expiresAt: String(row[5]),
                fromAccount: JSON.parse(String(row[6])) as UserPublicDto,
                toAccount: JSON.parse(String(row[7])) as UserPublicDto,
            }))
            .map(invitation => ({
                ...invitation,
                fromAccount: {
                    ...invitation.fromAccount,
                    avatar: JSON.parse(String(invitation.fromAccount.avatar)) as AvatarDto,
                },
                toAccount: {
                    ...invitation.toAccount,
                    avatar: JSON.parse(String(invitation.toAccount.avatar)) as AvatarDto,
                },
            }))
    }
}
