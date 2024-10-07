import { ApiProperty, OmitType } from '@nestjs/swagger'
import type { UserGetDto } from './user.type'

/**
 * base Invitation as it comes from db
 */
export class InvitationDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    groupId: number

    @ApiProperty({ example: 12345 })
    fromAccountId: number

    @ApiProperty({ example: 12345 })
    toAccountId: number

    @ApiProperty({ example: 'pending' })
    status: string // enum: ['pending', 'accepted', 'rejected']

    @ApiProperty({ example: '2021-10-10T12:00:00Z' })
    sentAt: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateInvitationBody extends OmitType(InvitationDto, ['id', 'sentAt']) {}
export class CreateInvitationByUsernameBody extends OmitType(InvitationDto, ['id', 'toAccountId', 'status', 'sentAt']) {
    @ApiProperty({ example: 'username', description: 'The username to invite.' })
    username: string
}

/**
 * Invitation with accounts data inserted
 */
export class InvitationWithAccountsData extends InvitationDto {
    @ApiProperty({ description: 'The account data of the user who invited.' })
    fromAccount: UserGetDto

    @ApiProperty({ description: 'The account data of the user to invite.' })
    toAccount: UserGetDto
}
