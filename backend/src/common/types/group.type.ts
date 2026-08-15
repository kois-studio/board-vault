import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

import { GameReviewDto } from './game-review.type'
import { UserPublicWithGames } from './user.type'

/**
 * base User as it comes from db
 */
export class GroupDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: "David's Group" })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({ example: 12345 })
    createdBy: number

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    createdAt: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateGroupBody extends OmitType(GroupDto, ['id', 'createdAt']) {}
export class CreateGroupRequestBody extends OmitType(CreateGroupBody, ['createdBy']) {}

/**
 * PUT requests --> you can only update the group name
 */
export class UpdateGroupBody extends PartialType(PickType(GroupDto, ['name'])) {}

/**
 * Public user identity with games + the date the user joined the group
 */
export class GroupMemberWithGames extends UserPublicWithGames {
    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the user joined the group.' })
    joinedAt: string

    @ApiProperty({ type: [GameReviewDto], description: 'Reviews of this account' })
    reviews: Array<GameReviewDto>
}

/**
 * Group with members and their games
 */
export class GroupWithMembersAndGames extends GroupDto {
    // add
    @ApiProperty({ type: [GroupMemberWithGames], description: 'The members of the group.' })
    members: Array<GroupMemberWithGames>
}
