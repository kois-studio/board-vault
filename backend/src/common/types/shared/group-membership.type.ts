import { ApiProperty, OmitType } from '@nestjs/swagger'

// Base User as it comes from the database
export class GroupMembershipDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the group.' })
    groupId: string

    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the membership was created.' })
    joinedAt: string
}

// POST requests --> no db generated props
export class CreateGroupMembershipBody extends OmitType(GroupMembershipDto, ['joinedAt']) {}
