import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'

import { AvatarDto } from './user.type'

export type GroupPersonKind = 'placeholder' | 'linked'
export type GroupPersonStatus = 'active' | 'archived'
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
    @MaxLength(100)
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
    @MaxLength(100)
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
}

export class GroupPeopleResponseDto {
    @ApiProperty({ type: [GroupPersonWorkspaceDto] })
    people: Array<GroupPersonWorkspaceDto>
}

export class GroupPersonIdsBody {
    @ApiProperty({ example: [1, 2, 3], type: [Number] })
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    personIds: Array<number>
}
