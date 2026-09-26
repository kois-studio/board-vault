import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator'

import type { GroupDto } from './group.type'
import type { UserPublicDto } from './user.type'

/**
 * base Invitation as it comes from db
 */
export class InvitationDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: 12345 })
    @IsInt()
    @Min(1)
    fromAccountId: number

    @ApiProperty({ example: 12345 })
    @IsInt()
    @Min(1)
    toAccountId: number

    @ApiProperty({ example: '2021-10-10T12:00:00Z' })
    sentAt: string

    @ApiProperty({ example: '2021-11-09T12:00:00Z', description: 'The invitation stops being actionable after this UTC timestamp.' })
    @IsString()
    @IsNotEmpty()
    expiresAt: string

    @ApiPropertyOptional({ example: 42, nullable: true, description: 'Placeholder targeted by this invitation, when applicable.' })
    @IsOptional()
    @IsInt()
    @Min(1)
    groupPersonId?: number | null
}

/**
 * POST requests --> no db generated props
 */
export class CreateInvitationBody extends OmitType(InvitationDto, ['id', 'sentAt', 'expiresAt']) {}
export class CreateInvitationRequestBody extends OmitType(CreateInvitationBody, ['fromAccountId']) {}
export class CreateInvitationByUsernameBody extends OmitType(InvitationDto, ['id', 'toAccountId', 'sentAt', 'expiresAt']) {
    @ApiProperty({ example: 'username', description: 'The username to invite.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
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
