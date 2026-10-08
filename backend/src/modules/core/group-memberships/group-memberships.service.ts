import { ResultSet } from '@libsql/client'
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common'

import { groupMembreshipsSchema } from '../../../common/schemas/index.js'
import { CreateGroupMembershipBody, GroupMembershipDto } from '../../../common/types/group-membership.type.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { ActivityNotifier } from '../notifications/activity-notifier.service.js'

@Injectable()
export class GroupMembershipsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly activityNotifier: ActivityNotifier,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GroupMembershipDto> {
        const groupMemberships = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            groupId: Number(row[1]),
            joinedAt: String(row[2]),
        }))

        const result = groupMembreshipsSchema.safeParse(groupMemberships)

        if (!result.success) {
            this.LOGGER.error('Failed to parse groupMemberships from database')
            return []
        }

        return result.data
    }

    async getGroupMemberships(): Promise<Array<GroupMembershipDto>> {
        this.LOGGER.log('Getting all memberships')
        const resultSet = await this.databaseService.groups.getGroupMemberships()

        return this._parseResultSet(resultSet)
    }

    async getGroupMembershipById(accountId: number, groupId: number): Promise<GroupMembershipDto> {
        this.LOGGER.log('Getting membership')
        const resultSet = await this.databaseService.groups.getGroupMembershipById(accountId, groupId)
        const memberships = this._parseResultSet(resultSet)

        const [membership] = memberships

        if (!membership) {
            throw new NotFoundException(`Membership with id ${accountId} ${groupId} not found`)
        }

        return membership
    }

    async getSafeGroupMembershipById(accountId: number, groupId: number): Promise<null | GroupMembershipDto> {
        try {
            return await this.getGroupMembershipById(accountId, groupId)
        } catch {
            this.LOGGER.error('Failed to get safe group membership by id')
            return null
        }
    }

    async getGroupMembershipsByAccountId(accountId: number): Promise<Array<GroupMembershipDto>> {
        this.LOGGER.log('Getting memberships for account')
        const resultSet = await this.databaseService.groups.getGroupMembershipsByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    async getGroupMembershipsByGroupId(groupId: number): Promise<Array<GroupMembershipDto>> {
        this.LOGGER.log('Getting memberships for group')
        const resultSet = await this.databaseService.groups.getGroupMembershipsByGroupId(groupId)

        return this._parseResultSet(resultSet)
    }

    async createGroupMembership(membershipDto: CreateGroupMembershipBody) {
        this.LOGGER.log('Creating membership')
        try {
            await this.databaseService.groups.createGroupMembership(membershipDto)

            return { success: true }
        } catch {
            this.LOGGER.error('Failed to create membership')
            throw new InternalServerErrorException('Failed to create membership')
        }
    }

    async createGroupMembershipFromInvitation(accountId: number, groupId: number) {
        const invitation = await this.databaseService.invitations.getInvitationByGroupAndRecipient(groupId, accountId)

        const [row] = invitation.rows

        if (!row) {
            throw new ForbiddenException('A pending invitation is required to join this group')
        }

        const result = await this.databaseService.invitations.acceptInvitationAtomically(Number(row[0]), accountId, groupId)

        await this.activityNotifier.memberJoined(groupId, accountId)

        return result
    }

    /**
     * The older way to leave a group. It leaves exactly like `DELETE /dashboard/users/:userId/groups/:groupId/members`:
     * upcoming sessions drop the person, history keeps them, and the owner cannot leave (ADR-0018).
     */
    async deleteGroupMembershipById(accountId: number, groupId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Leaving a group through its membership')
        const membership = await this.databaseService.groups.getGroupMembershipById(accountId, groupId)

        if (membership.rows.length === 0) {
            throw new NotFoundException(`Membership with id ${accountId} ${groupId} not found`)
        }

        const [group] = (await this.databaseService.groups.getGroupById(groupId)).rows

        if (Number(group?.['createdBy']) === accountId) {
            throw new BadRequestException('Owner cannot leave group')
        }

        await this.databaseService.groups.leaveGroup(accountId, groupId)

        return { success: true }
    }
}
