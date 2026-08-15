import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator'

import { GameProposalCompleteDto } from './game-proposal.type'
import { SupportedLanguage } from './game-translation.type'
import { GameWithTagsAndTranslationsDto, BrowseGamesPaginationDto } from './game.type'

export class UpdateGameTranslationsBody {
    @ApiProperty({
        description: 'English translation of the game title',
        example: 'Catan',
        required: false,
    })
    @IsOptional()
    @IsString()
    en?: string

    @ApiProperty({
        description: 'Spanish translation of the game title',
        example: 'Catan',
        required: false,
    })
    @IsOptional()
    @IsString()
    es?: string
}

export class UpdateGameTagsBody {
    @ApiProperty({
        description: 'Array of tag IDs to assign to the game',
        example: [1, 2, 3],
        type: [Number],
    })
    @IsArray()
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
    reviewNotes?: string

    @ApiProperty({
        example: 'https://www.example.com/game-image.jpg',
        required: false,
        description: 'Image URL for the game (if not provided in proposal)',
    })
    @IsOptional()
    @IsString()
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
