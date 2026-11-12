import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'

import { DISPLAY_NAME_MAX_LENGTH } from '../utils/display-name.js'

import { AvatarDto } from './user.type.js'

export type GroupPersonKind = 'placeholder' | 'linked'
export type GroupPersonStatus = 'active' | 'archived'
/** Where a person stands in their group (ADR-0018): history keeps everyone, and shows who left or deleted their account. */
export type GroupPersonStanding = 'member' | 'left' | 'deleted'
export const GROUP_PERSON_STANDINGS: Array<GroupPersonStanding> = ['member', 'left', 'deleted']
export type GroupPersonOwnershipStatus = 'asserted' | 'rejected' | 'disputed'
export type GroupPersonOwnershipSource = 'placeholder_setup' | 'account_collection' | 'claimed_import'
export type GroupPersonPreference = 'favorite' | 'like' | 'neutral' | 'avoid'

export class GroupPersonDto {
    @ApiProperty({ example: 42 })
    id: number

    @ApiProperty({ example: 7 })
    groupId: number

    @ApiProperty({ example: null, nullable: true })
    accountId: number | null

    @ApiProperty({ enum: ['placeholder', 'linked'] })
    kind: GroupPersonKind

    @ApiProperty({ enum: ['active', 'archived'] })
    status: GroupPersonStatus

    @ApiProperty({ example: 'Ana' })
    displayName: string

    @ApiPropertyOptional({ type: AvatarDto, nullable: true })
    avatar: AvatarDto | null

    @ApiProperty({
        enum: GROUP_PERSON_STANDINGS,
        description: '`left`: archived, or their account is no longer a member. `deleted`: their account was deleted.',
    })
    standing: GroupPersonStanding

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    createdAt: string

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    updatedAt: string

    @ApiProperty({ example: null, nullable: true })
    claimedAt: string | null
}

export class CreateGroupPersonBody {
    @ApiProperty({ example: 'Ana' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(DISPLAY_NAME_MAX_LENGTH)
    displayName: string

    @ApiPropertyOptional({ type: AvatarDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => AvatarDto)
    avatar?: AvatarDto | null
}

export class UpdateGroupPersonBody {
    @ApiPropertyOptional({ example: 'Ana' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(DISPLAY_NAME_MAX_LENGTH)
    displayName?: string

    @ApiPropertyOptional({ type: AvatarDto, nullable: true })
    @IsOptional()
    @ValidateNested()
    @Type(() => AvatarDto)
    avatar?: AvatarDto | null

    @ApiPropertyOptional({ enum: ['active', 'archived'] })
    @IsOptional()
    @IsIn(['active', 'archived'])
    status?: GroupPersonStatus
}

export class GroupPersonGameOwnershipDto {
    @ApiProperty({ example: 42 })
    gameId: number

    @ApiProperty({ enum: ['asserted', 'rejected', 'disputed'] })
    status: GroupPersonOwnershipStatus

    @ApiProperty({ enum: ['placeholder_setup', 'account_collection', 'claimed_import'] })
    source: GroupPersonOwnershipSource

    @ApiProperty({ example: 7 })
    enteredByAccountId: number

    @ApiProperty({ example: null, nullable: true })
    confirmedByAccountId: number | null

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    createdAt: string

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    updatedAt: string

    @ApiProperty({
        example: 'Codenames',
        nullable: true,
        description:
            "For a game from a linked account's shelf: the title of the edition that copy is, when its owner said which (ADR-0025). Null: the game's own title applies.",
    })
    copyTitle: string | null

    @ApiProperty({ example: 'en', nullable: true, description: 'The language of `copyTitle`.' })
    copyTitleLanguage: string | null
}

export class UpdateGroupPersonOwnershipBody {
    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    gameId: number

    @ApiProperty({ enum: ['asserted', 'rejected', 'disputed'] })
    @IsIn(['asserted', 'rejected', 'disputed'])
    status: GroupPersonOwnershipStatus
}

export class GroupPersonGamePreferenceDto {
    @ApiProperty({ example: 42 })
    gameId: number

    @ApiProperty({ enum: ['favorite', 'like', 'neutral', 'avoid'] })
    preference: GroupPersonPreference

    @ApiProperty({ enum: ['placeholder_setup', 'claimed_import', 'account_profile'] })
    source: 'placeholder_setup' | 'claimed_import' | 'account_profile'

    @ApiProperty({ example: 7 })
    enteredByAccountId: number

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    createdAt: string

    @ApiProperty({ example: '2026-09-25 12:00:00' })
    updatedAt: string
}

export class UpdateGroupPersonPreferenceBody {
    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    gameId: number

    @ApiProperty({ enum: ['favorite', 'like', 'neutral', 'avoid'] })
    @IsIn(['favorite', 'like', 'neutral', 'avoid'])
    preference: GroupPersonPreference
}

export class GroupPersonWorkspaceDto {
    @ApiProperty({ type: GroupPersonDto })
    person: GroupPersonDto

    @ApiProperty({ type: [GroupPersonGameOwnershipDto] })
    ownership: Array<GroupPersonGameOwnershipDto>

    @ApiProperty({ type: [GroupPersonGamePreferenceDto] })
    preferences: Array<GroupPersonGamePreferenceDto>

    @ApiProperty({
        example: false,
        description:
            "Whether the authenticated account may take over this person: it has no account, and the caller is a member who is not one of the group's people yet (#278).",
    })
    claimable: boolean

    @ApiProperty({
        example: false,
        description: 'Whether an invitation to the authenticated account suggested this person ("Is this you?").',
    })
    suggested: boolean
}

export class GroupPersonChoiceGameDto {
    @ApiProperty({ example: 42 })
    id: number

    @ApiProperty({ example: 'Codenames', nullable: true, description: "The game's title in the page's language (ADR-0025)." })
    title: string | null
}

/** Someone a new member may say "this is me" about (#278). */
export class GroupPersonChoiceDto {
    @ApiProperty({ type: () => GroupPersonDto })
    person: GroupPersonDto

    @ApiProperty({
        example: true,
        description: 'An invitation to the authenticated account suggested this person: shown first, as "Is this you?".',
    })
    suggested: boolean

    @ApiProperty({ type: [GroupPersonChoiceGameDto], description: 'The games the group says this person owns.' })
    games: Array<GroupPersonChoiceGameDto>

    @ApiProperty({ example: 4, description: 'Finished game nights this person came to.' })
    nights: number

    @ApiProperty({ example: '2026-10-30 19:00:00', nullable: true, description: 'The date of the last of those nights.' })
    lastNight: string | null
}

export class GroupPersonChoicesResponseDto {
    @ApiProperty({ type: [GroupPersonChoiceDto], description: "Empty when the caller is one of the group's people already." })
    choices: Array<GroupPersonChoiceDto>
}

/** A takeover the group can still undo (ADR-0027). */
export class GroupPersonTakeoverDto {
    @ApiProperty({ example: 12, description: 'The person that was taken over.' })
    groupPersonId: number

    @ApiProperty({ example: 7, description: 'The account that took it over.' })
    accountId: number

    @ApiProperty({ example: 'Carlos', description: 'The name the person had before, which undo gives back.' })
    previousName: string

    @ApiProperty({ example: '2026-11-11 10:00:00' })
    takenAt: string

    @ApiProperty({ example: '2026-12-11 10:00:00', description: 'Undo is possible until then (30 days).' })
    undoableUntil: string
}

export class GroupPersonTakeoversResponseDto {
    @ApiProperty({ type: [GroupPersonTakeoverDto] })
    takeovers: Array<GroupPersonTakeoverDto>
}

export class UndoGroupPersonTakeoverResponseDto {
    @ApiProperty({ example: 12, description: 'The person given back its name, games and earlier game nights.' })
    groupPersonId: number

    @ApiProperty({ example: 31, description: 'The new person of the account that had taken it over.' })
    newPersonId: number
}

export class GroupPeopleResponseDto {
    @ApiProperty({ type: [GroupPersonWorkspaceDto] })
    people: Array<GroupPersonWorkspaceDto>
}

export class GroupPersonCatalogQuery {
    @ApiPropertyOptional({
        type: String,
        example: 'catan',
        description: 'Optional title search for games that can be assigned to a group person.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search = ''
}

export class GroupPersonIdsBody {
    @ApiProperty({ example: [1, 2, 3], type: [Number] })
    @IsArray()
    @ArrayMaxSize(100)
    @IsInt({ each: true })
    @Min(1, { each: true })
    personIds: Array<number>
}

export class ClaimGroupPersonBody {
    @ApiProperty({ example: [42, 84], type: [Number], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @IsInt({ each: true })
    @Min(1, { each: true })
    ownershipGameIds?: Array<number>

    @ApiProperty({ example: [42], type: [Number], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @IsInt({ each: true })
    @Min(1, { each: true })
    preferenceGameIds?: Array<number>

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    importOwnershipToCollection?: boolean
}
