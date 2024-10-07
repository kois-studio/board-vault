import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { UserWithGames } from './user.type'

// Base User as it comes from the database
export class GroupDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the group.' })
    id: number

    @ApiProperty({ example: "David's Group", description: "The group's title." })
    name: string

    @ApiProperty({ example: 12345, description: 'The user ID who created the group.' })
    createdBy: number

    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the group was created.' })
    createdAt: string

    @ApiProperty({ example: false, description: 'Whether the group has been deleted.' })
    is_deleted: boolean
}

// POST requests --> no db generated props
export class CreateGroupBody extends OmitType(GroupDto, ['id', 'createdAt', 'is_deleted']) {}

// PUT requests --> you can only update the group name
export class UpdateGroupBody extends PartialType(PickType(GroupDto, ['name'])) {}

// Other custom structures apart from the CRUD operations
export class GroupMemberWithGames extends UserWithGames {
    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the user joined the group.' })
    joinedAt: string
}
export class GroupWithMembersAndGames extends GroupDto {
    // add
    @ApiProperty({ type: [GroupMemberWithGames], description: 'The members of the group.' })
    members: Array<GroupMemberWithGames>
}
