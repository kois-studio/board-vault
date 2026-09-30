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
            expiresAt: String(row[5]),
            groupPersonId: row[6] === null || row[6] === undefined ? null : Number(row[6]),
        }))
        const result = invitationsSchema.safeParse(invitations)

        if (!result.success) {
            this.LOGGER.error('Failed to parse invitations from database')
            return []
        }

        return result.data
    }

    async getInvitations(accountId: number): Promise<Array<InvitationDto>> {
        this.LOGGER.log('Getting invitations for the authenticated account')
        const resultSet = await this.databaseService.invitations.getUserInvitationsReceived(accountId)

        return this._parseResultSet(resultSet)
    }

    async getInvitationById(id: number): Promise<InvitationDto> {
        this.LOGGER.log('Getting invitation by id')
        const resultSet = await this.databaseService.invitations.getInvitationById(id)
        const invitations = this._parseResultSet(resultSet)

        if (invitations.length === 0) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }
        return invitations[0]
    }

    async getInvitationByIdForAccount(id: number, accountId: number): Promise<InvitationDto> {
        const invitation = await this.getInvitationById(id)

        if (invitation.fromAccountId !== accountId && invitation.toAccountId !== accountId) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }

        return invitation
    }

    async getUserInvitationsReceived(accountId: number): Promise<Array<InvitationDto>> {
        this.LOGGER.log('Getting invitations for user')
        const resultSet = await this.databaseService.invitations.getUserInvitationsReceived(accountId)

        return this._parseResultSet(resultSet)
    }

    isExpired(invitation: InvitationDto): boolean {
        return Date.parse(invitation.expiresAt) <= Date.now()
    }

    async createInvitation(invitationDto: CreateInvitationBody) {
        this.LOGGER.log('Creating invitation')
        try {
            await this.databaseService.invitations.createInvitation(invitationDto)

            return { success: true }
        } catch {
            this.LOGGER.error('Invitation creation failed')
            throw new BadRequestException('Invitation creation failed')
        }
    }

    // TODO: composite en databaseService? oh nonono
    async createInvitationByUsername(invitationDto: CreateInvitationByUsernameBody): Promise<UserPublicDto> {
        this.LOGGER.log('Creating invitation by username')
        const userRow = await this.databaseService.invitations.createInvitationByUsername(invitationDto)

        return {
            id: Number(userRow.id),
            username: String(userRow.username),
            avatar: JSON.parse(String(userRow.avatar)) as AvatarDto,
            displayName: String(userRow.displayName),
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
        this.LOGGER.log('Deleting invitation')
        const resultSet = await this.databaseService.invitations.deleteInvitationById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Invitation with id ${id} not found`)
        }

        return { success: true }
    }

    async rejectInvitation(invitationId: number, requesterId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Rejecting invitation')

        return this.deleteInvitationForRecipient(invitationId, requesterId)
    }
}
