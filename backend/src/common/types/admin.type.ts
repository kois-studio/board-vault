import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

import { GameProposalCompleteDto } from './game-proposal.type.js'
import { GAME_LENGTHS, GameWithTagsAndTranslationsDto, BrowseGamesPaginationDto } from './game.type.js'

import type { GameLength } from './game.type.js'

const ADMIN_PAGE_SIZE_MAX = 100

export const CATALOGUE_QUALITY_ISSUES = ['no-title', 'no-artwork', 'no-spanish', 'no-tags'] as const
export type CatalogueQualityIssue = (typeof CATALOGUE_QUALITY_ISSUES)[number]

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

    @ApiPropertyOptional({ type: Number, example: 4, minimum: 1, maximum: 100, description: 'Only games that play with this many people.' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    players?: number

    @ApiPropertyOptional({ enum: GAME_LENGTHS, description: 'Average length, as in Browse.' })
    @IsOptional()
    @IsIn(GAME_LENGTHS)
    length?: GameLength

    @ApiPropertyOptional({ type: String, example: '3,7', description: 'Comma-separated tag ids. A game must have all of them.' })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean).map(Number) : value))
    @IsArray()
    @ArrayMaxSize(10)
    @IsInt({ each: true })
    @Min(1, { each: true })
    tags: number[] = []

    @ApiPropertyOptional({
        enum: CATALOGUE_QUALITY_ISSUES,
        description:
            'Only games with this data problem: no English title; no artwork; no Spanish title or one equal to the English; or no tags.',
    })
    @IsOptional()
    @IsIn(CATALOGUE_QUALITY_ISSUES)
    issue?: CatalogueQualityIssue
}

/** One game as the admin catalogue lists it. */
export class AdminGameDto extends GameWithTagsAndTranslationsDto {
    @ApiProperty({ example: 'Catan', description: 'The English title (empty only for a game without one).' })
    title: string

    @ApiProperty({
        enum: CATALOGUE_QUALITY_ISSUES,
        isArray: true,
        description: 'Data problems this game has, as the issue filter defines them.',
    })
    issues: Array<CatalogueQualityIssue>
}

/** Titles to save; an empty Spanish title removes it. */
export class AdminGameTitlesBody {
    @ApiPropertyOptional({ example: 'Catan' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    en?: string

    @ApiPropertyOptional({ example: 'Los colonos de Catán', description: 'Empty removes the Spanish title.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    es?: string
}

/** Changes to one catalogue game. Every field is optional; the ones sent are saved together. */
export class UpdateAdminGameBody {
    @ApiPropertyOptional({ type: AdminGameTitlesBody })
    @IsOptional()
    @ValidateNested()
    @Type(() => AdminGameTitlesBody)
    translations?: AdminGameTitlesBody

    @ApiPropertyOptional({ example: 'https://www.example.com/catan.jpg', description: 'Empty means no artwork.' })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    imageUrl?: string

    @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    minPlayers?: number

    @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    maxPlayers?: number

    @ApiPropertyOptional({ example: 90, minimum: 1, maximum: 1440, description: 'Average length in minutes.' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1440)
    gameAvgDuration?: number

    @ApiPropertyOptional({ example: [1, 2], description: 'The whole set of tags; replaces the current ones.' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    @IsInt({ each: true })
    @Min(1, { each: true })
    tagIds?: number[]
}

class OverviewProposalsDto {
    @ApiProperty({ example: 3 })
    pending: number

    @ApiProperty({
        example: '2026-10-01 09:30:00',
        nullable: true,
        type: String,
        description: 'When the oldest pending proposal was sent.',
    })
    oldestPendingAt: string | null
}

class OverviewCatalogueIssuesDto {
    @ApiProperty({ example: 0 })
    'no-title': number

    @ApiProperty({ example: 4 })
    'no-artwork': number

    @ApiProperty({ example: 12 })
    'no-spanish': number

    @ApiProperty({ example: 2 })
    'no-tags': number
}

class OverviewTagsDto {
    @ApiProperty({ example: 5, description: 'Tags no game has.' })
    unused: number

    @ApiProperty({ example: 0, description: 'Categories with no tags.' })
    emptyCategories: number
}

class OverviewRankedGameDto {
    @ApiProperty({ example: 4 })
    gameId: number

    @ApiProperty({ example: 'Azul' })
    title: string

    @ApiProperty({ example: 6, description: 'How many people own it, or want it.' })
    count: number
}

class OverviewCatalogueDto {
    @ApiProperty({ example: 65 })
    games: number

    @ApiProperty({ example: 3, description: 'Proposals approved in the last 30 days (games carry no creation date).' })
    approvedLast30Days: number

    @ApiProperty({ type: [OverviewRankedGameDto] })
    mostOwned: Array<OverviewRankedGameDto>

    @ApiProperty({ type: [OverviewRankedGameDto], description: 'Most wishlisted games that nobody owns.' })
    mostWantedUnowned: Array<OverviewRankedGameDto>
}

class OverviewDecisionDto {
    @ApiProperty({ example: 12 })
    proposalId: number

    @ApiProperty({ example: 'Azul' })
    title: string

    @ApiProperty({ enum: ['approved', 'rejected', 'duplicate'] })
    status: 'approved' | 'rejected' | 'duplicate'

    @ApiProperty({ example: '2026-10-05 18:00:00' })
    reviewedAt: string

    @ApiProperty({ example: 'Admin', nullable: true, type: String })
    reviewerName: string | null

    @ApiProperty({ example: 40, nullable: true, type: Number })
    createdGameId: number | null
}

/** What needs doing and the catalogue at a glance: aggregate counts, no personal data beyond reviewer names. */
export class AdminOverviewDto {
    @ApiProperty({ type: OverviewProposalsDto })
    proposals: OverviewProposalsDto

    @ApiProperty({ type: OverviewCatalogueIssuesDto, description: 'Games with each data problem, as the Games filter defines them.' })
    catalogueIssues: Record<CatalogueQualityIssue, number>

    @ApiProperty({ type: OverviewTagsDto })
    tags: OverviewTagsDto

    @ApiProperty({ type: OverviewCatalogueDto })
    catalogue: OverviewCatalogueDto

    @ApiProperty({ type: [OverviewDecisionDto], description: 'The last ten proposal decisions.' })
    recentDecisions: Array<OverviewDecisionDto>
}

export class MergeTagBody {
    @ApiProperty({ example: 7, description: 'The tag that keeps existing; every game with the merged tag gets this one.' })
    @IsInt()
    @Min(1)
    intoTagId: number
}

export class MergeTagResultDto {
    @ApiProperty({ example: 12, description: 'Games that gained the kept tag (they had only the merged one).' })
    gamesMoved: number
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

export class AdminGamesResponseDto {
    @ApiProperty({
        description: 'One page of the catalogue, by English title',
        type: [AdminGameDto],
    })
    games: Array<AdminGameDto>

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
