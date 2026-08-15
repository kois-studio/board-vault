import { ApiProperty, OmitType } from '@nestjs/swagger'

import type { GroupDto } from './group.type'
import type { UserPublicDto } from './user.type'

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

    @ApiProperty({ example: '2021-10-10T12:00:00Z' })
    sentAt: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateInvitationBody extends OmitType(InvitationDto, ['id', 'sentAt']) {}
export class CreateInvitationRequestBody extends OmitType(CreateInvitationBody, ['fromAccountId']) {}
export class CreateInvitationByUsernameBody extends OmitType(InvitationDto, ['id', 'toAccountId', 'sentAt']) {
    @ApiProperty({ example: 'username', description: 'The username to invite.' })
    username: string
}
export class CreateInvitationByUsernameRequestBody extends OmitType(CreateInvitationByUsernameBody, ['fromAccountId']) {}

/**
 * Invitation with accounts data inserted
 */
export class InvitationWithAccountsData extends InvitationDto {
    @ApiProperty({ description: 'The account data of the user who made the invitation.' })
    fromAccount: UserPublicDto

    @ApiProperty({ description: 'The account data of the user to invite.' })
    toAccount: UserPublicDto
}

export class InvitationWithExtraData extends InvitationDto {
    @ApiProperty({ description: 'The account data of the user who was invited.' })
    fromAccount: UserPublicDto

    @ApiProperty({ description: 'The group data of the group the user was invited to.' })
    group: GroupDto
}
