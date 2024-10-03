import { ApiProperty } from '@nestjs/swagger'

export class GroupWithMembers {
    @ApiProperty({ example: 15, description: 'UserGroup.id' })
    groupId: number

    @ApiProperty({ example: 'Board Gamers', description: 'UserGroup.name' })
    groupName: string

    @ApiProperty({ example: 1, description: 'UserGroup.createdBy' })
    groupCreatedBy: number

    @ApiProperty({ example: '2021-09-01T12:00:00Z', description: 'UserGroup.createdAt' })
    groupCreatedAt: string

    @ApiProperty({ example: '2021-09-01T12:00:00Z', description: 'GroupMembership.joinedAt' })
    membershipJoinedAt: string
}
