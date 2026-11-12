import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator'

import { GameReviewDto } from './game-review.type.js'
import { GameCompleteDto } from './game.type.js'
import { AvatarDto, UserPublicDto, UserPublicWithGames } from './user.type.js'

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

    @ApiProperty({ type: [GameCompleteDto], description: 'The same games, with their details, for the group library.' })
    games: Array<GameCompleteDto>
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

/**
 * A member in a group overview (#262): who they are and how many games they bring, not the games themselves,
 * so the overview stays the same size however big everyone's collection gets.
 */
export class GroupOverviewMember extends UserPublicDto {
    @ApiProperty({ example: '2024-09-28 10:02:39', description: 'The date and time the user joined the group.' })
    joinedAt: string

    @ApiProperty({ example: 14, description: 'How many games this member owns.' })
    gameCount: number
}

/** A group person without an account (ADR-0010) in a group overview, with how many games are recorded for them. */
export class GroupOverviewPlaceholder {
    @ApiProperty({ example: 12 })
    id: number

    @ApiProperty({ example: 'Lucía' })
    displayName: string

    @ApiProperty({ type: AvatarDto, nullable: true })
    avatar: AvatarDto | null

    @ApiProperty({ example: 3, description: 'How many games are recorded as owned by this person in the group.' })
    gameCount: number
}

/**
 * One of your groups for Home and the lists of groups (#262): its people and counts. A page about the group reads
 * its games, owners and reviews from the group's shelf.
 */
export class GroupOverviewDto extends GroupDto {
    @ApiProperty({ example: 37, description: 'Distinct games anyone in the group owns, members or people without an account.' })
    gameCount: number

    @ApiProperty({ type: [GroupOverviewMember], description: 'The members of the group.' })
    members: Array<GroupOverviewMember>

    @ApiProperty({ type: [GroupOverviewPlaceholder], description: 'Active group people without an account.' })
    placeholders: Array<GroupOverviewPlaceholder>
}

/** Who brings which games to a group: a member (accountId) or a person without an account (groupPersonId). */
export class GroupShelfOwnerDto {
    @ApiProperty({ example: 4, nullable: true, description: 'Set for a member with an account.' })
    accountId: number | null

    @ApiProperty({ example: 12, nullable: true, description: 'Set for an active person in the group without an account.' })
    groupPersonId: number | null

    @ApiProperty({ type: [Number], description: 'The games they own; empty when they own none.' })
    gameIds: Array<number>
}

/**
 * Everything a page about one group needs about its games (#262): each game once, who owns it, and the members'
 * ratings. Every member whose account still exists, and every active person without an account, has an owner entry.
 */
export class GroupShelfDto {
    @ApiProperty({ type: [GameCompleteDto], description: 'Every game anyone in the group owns, once each.' })
    games: Array<GameCompleteDto>

    @ApiProperty({ type: [GroupShelfOwnerDto], description: 'Members first, then people without an account.' })
    owners: Array<GroupShelfOwnerDto>

    @ApiProperty({ type: [GameReviewDto], description: "The members' ratings, of any game." })
    reviews: Array<GameReviewDto>
}
