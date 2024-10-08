import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { invitationsSchema } from '../../common/schemas'
import { CreateInvitationBody, CreateInvitationByUsernameBody, InvitationDto } from '../../common/types/invitation.type'
import { UserGetDto } from 'src/common/types/user.type'

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
            status: String(row[4]),
            sentAt: String(row[5]),
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

    async getInvitationById(id: number): Promise<InvitationDto | NotFoundException> {
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
        const row = await this.databaseService.createInvitationByUsername(invitationDto)

        return {
            id: Number(row[0]),
            email: String(row[1]),
            // password: String(row[2]), // Do not return password
            createdAt: String(row[3]),
            username: String(row[4]),
            imageUrl: String(row[5]),
            is_deleted: Boolean(row[6]),
            display_name: String(row[7]),
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
}
