import { ResultSet } from '@libsql/client/.'
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { invitationsSchema } from '../../../common/schemas'
import { DatabaseService } from '../../common/database/database.service'

import type { CreateInvitationBody, CreateInvitationByUsernameBody, InvitationDto } from '../../../common/types/invitation.type'
import type { AvatarDto, UserPublicDto } from '../../../common/types/user.type'

@Injectable()
export class InvitationsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

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

    async getUserInvitationsReceived(accountId: number): Promise<Array<InvitationDto>> {
        this.LOGGER.log(`Getting invitations for user with id ${accountId}`)
        const resultSet = await this.databaseService.getUserInvitationsReceived(accountId)

        return this._parseResultSet(resultSet)
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

    // TODO: composite en databaseService? oh nonono
    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody): Promise<UserPublicDto> {
        this.LOGGER.log(
            `Creating invitation to group ${invitationDto.groupId}: ${invitationDto.fromAccountId} -> ${invitationDto.username}`,
        )
        const userRow = await this.databaseService.createInvitationByUsername(invitationDto)

        return {
            id: Number(userRow[0]),
            username: String(userRow[2]),
            avatar: JSON.parse(String(userRow[4])) as AvatarDto,
            displayName: String(userRow[5]),
        }
    }

    async deleteInvitationById(id: number, requesterId: number): Promise<{ success: boolean }> {
        const invitation = await this.getInvitationById(id)

        if (invitation.fromAccountId !== requesterId) {
            throw new ForbiddenException('You are not allowed to cancel this invitation')
        }

        return this.deleteInvitationRecord(id)
    }

    async deleteInvitationForRecipient(id: number, requesterId: number): Promise<{ success: boolean }> {
        const invitation = await this.getInvitationById(id)

        if (invitation.toAccountId !== requesterId) {
            throw new ForbiddenException('You are not the recipient of this invitation')
        }

        return this.deleteInvitationRecord(id)
    }

    private async deleteInvitationRecord(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting invitation with id ${id}`)
        const resultSet = await this.databaseService.deleteInvitationById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }

        return { success: true }
    }

    async rejectInvitation(invitationId: number, requesterId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Rejecting invitation with id ${invitationId}`)

        return this.deleteInvitationForRecipient(invitationId, requesterId)
    }
}
