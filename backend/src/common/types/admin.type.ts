import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

import { GameProposalCompleteDto } from './game-proposal.type.js'
import { GameWithTagsAndTranslationsDto, BrowseGamesPaginationDto } from './game.type.js'

const ADMIN_PAGE_SIZE_MAX = 100

export class AdminGamesQuery {
    @ApiPropertyOptional({ type: String, example: 'catan', description: 'Title search, across supported translations.' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string

    @ApiPropertyOptional({ type: Number, example: 1, default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1

    @ApiPropertyOptional({ type: Number, example: 10, default: 10, minimum: 1, maximum: ADMIN_PAGE_SIZE_MAX })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ADMIN_PAGE_SIZE_MAX)
    limit = 10
}

export class AdminProposalsQuery {
    @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'duplicate'] })
    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected', 'duplicate'])
    status?: 'pending' | 'approved' | 'rejected' | 'duplicate'

    @ApiPropertyOptional({ type: Number, example: 1, default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1

    @ApiPropertyOptional({ type: Number, example: 10, default: 10, minimum: 1, maximum: ADMIN_PAGE_SIZE_MAX })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(ADMIN_PAGE_SIZE_MAX)
    limit = 10
}

export class DuplicateGameProposalBody {
    @ApiProperty({ example: 42, description: 'The catalogue game this proposal duplicates; the proposer is told about it.' })
    @IsInt()
    @Min(1)
    duplicateOfGameId: number

    @ApiPropertyOptional({ example: 'Listed under its Spanish title.' })
    @IsOptional()
    @IsString()
    @MaxLength(280)
    reviewNotes?: string
}

/** Title per supported language; any other key is rejected. */
export class ProposalTranslationsBody {
    @ApiPropertyOptional({ example: 'Catan' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    en?: string

    @ApiPropertyOptional({ example: 'Los colonos de Catán' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    es?: string
}

export class UpdateGameTranslationsBody {
    @ApiProperty({
        description: 'English translation of the game title',
        example: 'Catan',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    en?: string

    @ApiProperty({
        description: 'Spanish translation of the game title',
        example: 'Catan',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    es?: string
}

export class UpdateGameTagsBody {
    @ApiProperty({
        description: 'Array of tag IDs to assign to the game',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsArray()
    @ArrayMaxSize(100)
    @IsInt({ each: true })
    @Min(1, { each: true })
    tagIds: number[]
}

export class AdminGamesResponseDto {
    @ApiProperty({
        description: 'Array of games with their translations and tags',
        type: [GameWithTagsAndTranslationsDto],
    })
    games: Array<GameWithTagsAndTranslationsDto>

    @ApiProperty({
        description: 'Pagination information',
        type: BrowseGamesPaginationDto,
    })
    pagination: BrowseGamesPaginationDto
}

export class ApproveGameProposalBody {
    @ApiProperty({
        example: 'Great game for our collection!',
        required: false,
        description: 'Admin review notes for approval',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reviewNotes?: string

    @ApiProperty({
        example: 'https://www.example.com/game-image.jpg',
        required: false,
        description: 'Artwork URL; overrides the proposal. Empty means no artwork.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    imageUrl?: string

    @ApiProperty({
        example: 120,
        required: false,
        description: 'Average length in minutes; overrides the proposal. Required when the proposal has none.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1440)
    gameAvgDuration?: number

    @ApiProperty({
        example: 3,
        required: false,
        description: 'Minimum players; overrides the proposal. Required when the proposal has none.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    minPlayers?: number

    @ApiProperty({
        example: 4,
        required: false,
        description: 'Maximum players; overrides the proposal. Required when the proposal has none.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    maxPlayers?: number

    @ApiProperty({
        type: ProposalTranslationsBody,
        required: false,
        description: 'Title per language. English defaults to the proposed title.',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => ProposalTranslationsBody)
    translations?: ProposalTranslationsBody

    @ApiProperty({
        example: [1, 2, 3],
        required: false,
        description: 'Tag IDs to assign to the game',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @IsInt({ each: true })
    @Min(1, { each: true })
    tagIds?: number[]
}

export class RejectGameProposalBody {
    @ApiProperty({
        example: 'This game is already in our database',
        description: 'Admin review notes explaining the rejection',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    reviewNotes: string
}

export class ProposalStatusCountsDto {
    @ApiProperty({ example: 3 })
    pending: number

    @ApiProperty({ example: 40 })
    approved: number

    @ApiProperty({ example: 5 })
    rejected: number

    @ApiProperty({ example: 2 })
    duplicate: number
}

export class AdminGameProposalsResponseDto {
    @ApiProperty({
        description: 'Array of game proposals with submitter and reviewer information',
        type: [GameProposalCompleteDto],
    })
    proposals: Array<GameProposalCompleteDto>

    @ApiProperty({
        description: 'Pagination information',
        type: BrowseGamesPaginationDto,
    })
    pagination: BrowseGamesPaginationDto

    @ApiProperty({ type: ProposalStatusCountsDto, description: 'How many proposals have each status, for the filter tabs' })
    statusCounts: ProposalStatusCountsDto
}
