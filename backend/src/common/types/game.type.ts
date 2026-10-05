import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

import { GameTagWithCategoryDto } from './tag.type'

import type { SupportedLanguage } from './game-translation.type'

/**
 * base Game as it comes from db
 */
export class GameDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 'https://www.example.com/image.jpg' })
    imageUrl: string

    @ApiProperty({ example: 120, description: 'The average duration of the game in minutes.' })
    gameAvgDuration: number

    @ApiProperty({ example: 3, description: 'The minimum number of players required to play the game.' })
    minPlayers: number

    @ApiProperty({ example: 4, description: 'The maximum number of players that can play the game.' })
    maxPlayers: number
}

export class GameCompleteDto extends GameDto {
    @ApiProperty({ example: 'Game Title', required: false })
    title?: string

    @ApiProperty({ example: { en: 'Game Title' } })
    titleTranslations: Record<SupportedLanguage, string>
}

export class GameWithTagsAndTranslationsDto extends GameDto {
    @ApiProperty({
        example: { en: 'Catan', es: 'Catan' },
        description: 'Game title translations for supported languages',
    })
    translations: Record<SupportedLanguage, string>

    @ApiProperty({
        type: [GameTagWithCategoryDto],
        description: 'Tags assigned to this game with their categories',
    })
    tags: Array<GameTagWithCategoryDto>
}

export class BrowseGamesPaginationDto {
    @ApiProperty({ example: 1 })
    currentPage: number

    @ApiProperty({ example: 10 })
    totalPages: number

    @ApiProperty({ example: 100 })
    totalItems: number

    @ApiProperty({ example: 10 })
    itemsPerPage: number
}

export class BrowseGamesResultDto {
    @ApiProperty({ type: [GameCompleteDto] })
    games: Array<GameCompleteDto>

    @ApiProperty({ type: BrowseGamesPaginationDto })
    pagination: BrowseGamesPaginationDto
}

export class GameOwnershipDto {
    @ApiProperty({ example: '2026-09-01', nullable: true })
    purchaseDate: string | null

    @ApiProperty({ example: 42.5, nullable: true })
    purchasePrice: number | null

    @ApiProperty({ example: 'Bought for the group', nullable: true })
    purchaseNotes: string | null
}

export class GameViewTagDto {
    @ApiProperty({ example: 'Strategy' })
    tag: string

    @ApiProperty({ example: 'Genre' })
    category: string
}

export class GameWishlistDto {
    @ApiProperty({ example: '2026-09-01' })
    dateAdded: string

    @ApiProperty({ example: 'Suggested by a friend' })
    notes: string
}

export class GameViewRatingSummaryDto {
    @ApiProperty({ example: 8.5 })
    review: number

    @ApiProperty({ example: 4 })
    count: number
}

export class GameViewRatingDto {
    @ApiProperty({ example: 9, nullable: true })
    userRating: number | null

    @ApiProperty({ type: GameViewRatingSummaryDto, nullable: true })
    avgGroupsRating: GameViewRatingSummaryDto | null

    @ApiProperty({ type: GameViewRatingSummaryDto, nullable: true })
    avgGlobalRating: GameViewRatingSummaryDto | null
}

export const GAME_LENGTHS = ['short', 'medium', 'long', 'epic'] as const
export type GameLength = (typeof GAME_LENGTHS)[number]

export const BROWSE_SORTS = ['title', 'shortest', 'newest'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

export class BrowseGamesQuery {
    @ApiPropertyOptional({ type: String, example: 'catan', description: 'Title search across supported translations.' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search = ''

    @ApiPropertyOptional({ type: Number, example: 1, default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1

    @ApiPropertyOptional({ type: Number, example: 20, default: 20, minimum: 1, maximum: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    limit = 20

    @ApiPropertyOptional({ type: Number, example: 4, minimum: 1, maximum: 20, description: 'Only games that play with this many people.' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    players?: number

    @ApiPropertyOptional({
        enum: GAME_LENGTHS,
        description: 'Average length: short under 30 min, medium 30 to 60, long 61 to 120, epic over 120.',
    })
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

    @ApiPropertyOptional({ type: Boolean, default: false, description: 'Leave out the games the user owns.' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    hideOwned = false

    @ApiPropertyOptional({ enum: BROWSE_SORTS, default: 'title' })
    @IsOptional()
    @IsIn(BROWSE_SORTS)
    sort: BrowseSort = 'title'
}

/**
 * GET game view
 * when a user is logged in and access a game view
 */
export class GameViewDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto

    @ApiProperty({ type: GameOwnershipDto, nullable: true })
    ownedGameData: GameOwnershipDto | null

    @ApiProperty({ type: [GameViewTagDto] })
    tags: Array<GameViewTagDto>

    @ApiProperty({ type: GameWishlistDto, nullable: true })
    wishlistedGameData: GameWishlistDto | null

    @ApiProperty({ type: GameViewRatingDto })
    ratingData: GameViewRatingDto

    @ApiProperty({ type: [GameCompleteDto] })
    similarGames: Array<GameCompleteDto>
}
