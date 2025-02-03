import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { invitationsSchema } from '../../common/schemas'
import { CreateInvitationBody, CreateInvitationByUsernameBody, InvitationDto } from '../../common/types/invitation.type'
import { UserGetDto } from '../../common/types/user.type'
import { GroupsService } from '../groups/groups.service'
import { GroupMembershipsService } from '../group-memberships/group-memberships.service'
import { UsersService } from '../users/users.service'
import { NotificationsService } from '../notifications/notifications.service'
import { NotificationTypeEnum } from '../../common/types/notification.type'

@Injectable()
export class InvitationsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<InvitationDto> {
        const invitations = resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            fromAccountId: Number(row[2]),
            toAccountId: Number(row[3]),
            sentAt: String(row[4]),
        }))
        const result = invitationsSchema.safeParse(invitations)

        if (!result.success) {
            this.LOGGER.error('Failed to parse invitations from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getInvitations(): Promise<Array<InvitationDto>> {
        this.LOGGER.log('Getting all invitations')
        const resultSet = await this.databaseService.getInvitations()

        return this._parseResultSet(resultSet)
    }

    async getInvitationById(id: number): Promise<InvitationDto> {
        this.LOGGER.log(`Getting invitation with id ${id}`)
        const resultSet = await this.databaseService.getInvitationById(id)
        const invitations = this._parseResultSet(resultSet)

        if (invitations.length === 0) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }
        return invitations[0]
    }

    async createInvitation(invitationDto: CreateInvitationBody) {
        this.LOGGER.log(
            `Creating invitation to group ${invitationDto.groupId}: ${invitationDto.fromAccountId} -> ${invitationDto.toAccountId}`,
        )
        try {
            await this.databaseService.createInvitation(invitationDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Invitation creation failed', error)
            throw new BadRequestException('Invitation creation failed')
        }
    }

    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody): Promise<UserGetDto> {
        this.LOGGER.log(
            `Creating invitation to group ${invitationDto.groupId}: ${invitationDto.fromAccountId} -> ${invitationDto.username}`,
        )
        const userRow = await this.databaseService.createInvitationByUsername(invitationDto)

        return {
            id: Number(userRow[0]),
            email: String(userRow[1]),
            username: String(userRow[2]),
            // password: String(userRow[3]), // Do not return password
            imageUrl: String(userRow[4]),
            displayName: String(userRow[5]),
            createdAt: String(userRow[6]),
            isDeleted: Boolean(userRow[7]),
        }
    }

    async deleteInvitationById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting invitation with id ${id}`)
        const resultSet = await this.databaseService.deleteInvitationById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }

        return { success: true }
    }

    async acceptInvitation(invitationId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Accepting invitation with id ${invitationId}`)

        // Step 1: get invitation data
        const invitationData = await this.getInvitationById(invitationId)

        // Step 2: get group data (it may have been deleted)
        const groupId = invitationData.groupId
        const groupData = await this.groupsService.getGroupById(groupId)

        // Step 3: create the membership to the group
        await this.groupMembershipsService.createGroupMembership({ accountId: invitationData.toAccountId, groupId })

        // Step 4: delete the invitation
        await this.deleteInvitationById(invitationId)

        // Step 5: create the notification for the group owner
        const invited = await this.usersService.getUserById(invitationData.toAccountId)
        const owner = await this.usersService.getUserById(groupData.createdBy)

        await this.notificationsService.createNotification({
            accountId: owner.id,
            type: NotificationTypeEnum.InvitationAccepted,
            message: `${invited.displayName} joined your group ${groupData.name}`,
        })

        return { success: true }
    }

    async rejectInvitation(invitationId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Rejecting invitation with id ${invitationId}`)

        return { success: true }
    }
}
