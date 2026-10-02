import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator'

import { GameReviewDto } from './game-review.type'
import { AvatarDto, UserPublicWithGames } from './user.type'

export class CreatedGroupDto {
    @ApiProperty({ example: true, description: 'Whether the group was created successfully.' })
    success: true

    @ApiProperty({ example: 42, description: 'The newly created group identifier.' })
    groupId: number
}

/**
 * Compatibility parameters for the deprecated dashboard group-creation URL.
 * New clients should use POST /groups with CreateGroupRequestBody.
 */
export class LegacyCreateGroupParams {
    @ApiProperty({ example: 12345, description: 'The authenticated account identifier.' })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    userId: number

    @ApiProperty({ example: "Friday game's group", description: 'The name of the new group.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    groupName: string
}

/**
 * base User as it comes from db
 */
export class GroupDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 'Example Group' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
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
 * A group person without an account (ADR-0010), with the games recorded for them.
 */
export class GroupPlaceholderSummary {
    @ApiProperty({ example: 12 })
    id: number

    @ApiProperty({ example: 'Lucía' })
    displayName: string

    @ApiProperty({ type: AvatarDto, nullable: true })
    avatar: AvatarDto | null

    @ApiProperty({ type: [Number], description: 'Games recorded as owned by this person in the group.' })
    gameIds: Array<number>
}

/**
 * Group with members and their games
 */
export class GroupWithMembersAndGames extends GroupDto {
    // add
    @ApiProperty({ type: [GroupMemberWithGames], description: 'The members of the group.' })
    members: Array<GroupMemberWithGames>

    @ApiProperty({ type: [GroupPlaceholderSummary], description: 'Active group people without an account.' })
    placeholders: Array<GroupPlaceholderSummary>
}
