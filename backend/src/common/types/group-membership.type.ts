import { ApiProperty, OmitType } from '@nestjs/swagger'
import { IsInt, Min } from 'class-validator'

/**
 * base GroupMembership as it comes from db
 */
export class GroupMembershipDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the account.' })
    @IsInt()
    @Min(1)
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the group.' })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the membership was created.' })
    joinedAt: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateGroupMembershipBody extends OmitType(GroupMembershipDto, ['joinedAt']) {}
export class CreateGroupMembershipRequestBody extends OmitType(CreateGroupMembershipBody, ['accountId']) {}
