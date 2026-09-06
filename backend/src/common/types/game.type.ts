import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

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

export class BrowseGamesQuery {
    @ApiPropertyOptional({ example: 'catan', description: 'Title search across supported translations.' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search = ''

    @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1

    @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    limit = 20
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
