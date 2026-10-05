import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

import { GameProposalCompleteDto } from './game-proposal.type.js'
import { SupportedLanguage } from './game-translation.type.js'
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

export class AdminDuplicateProposalQuery {
    @ApiPropertyOptional({ example: 'Already present in the catalog.' })
    @IsOptional()
    @IsString()
    @MaxLength(280)
    reviewNotes?: string
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
        description: 'Image URL for the game (if not provided in proposal)',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    imageUrl?: string

    @ApiProperty({
        example: 120,
        required: false,
        description: 'Average duration in minutes (if not provided in proposal)',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    gameAvgDuration?: number

    @ApiProperty({
        example: 3,
        required: false,
        description: 'Minimum players (if not provided in proposal)',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    minPlayers?: number

    @ApiProperty({
        example: 4,
        required: false,
        description: 'Maximum players (if not provided in proposal)',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxPlayers?: number

    @ApiProperty({
        example: { en: 'Catan', es: 'Catan' },
        required: false,
        description: 'Game title translations',
    })
    @IsOptional()
    @IsObject()
    translations?: Record<SupportedLanguage, string>

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
}
