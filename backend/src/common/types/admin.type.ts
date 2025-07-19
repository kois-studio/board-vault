import { ApiProperty } from '@nestjs/swagger'
import { SupportedLanguage } from './game-translation.type'
import { GameWithTagsAndTranslationsDto, BrowseGamesPaginationDto } from './game.type'
import { GameProposalDto, GameProposalCompleteDto } from './game-proposal.type'

export class UpdateGameTranslationsBody {
    @ApiProperty({ 
        description: 'English translation of the game title',
        example: 'Catan',
        required: false
    })
    en?: string

    @ApiProperty({ 
        description: 'Spanish translation of the game title',
        example: 'Catan',
        required: false
    })
    es?: string
}

export class UpdateGameTagsBody {
    @ApiProperty({ 
        description: 'Array of tag IDs to assign to the game',
        example: [1, 2, 3],
        type: [Number]
    })
    tagIds: number[]
}

export class AdminGamesResponseDto {
    @ApiProperty({ 
        description: 'Array of games with their translations and tags',
        type: [GameWithTagsAndTranslationsDto]
    })
    games: Array<GameWithTagsAndTranslationsDto>

    @ApiProperty({ 
        description: 'Pagination information',
        type: BrowseGamesPaginationDto
    })
    pagination: BrowseGamesPaginationDto
}

export class ApproveGameProposalBody {
    @ApiProperty({ 
        example: 'Great game for our collection!',
        required: false,
        description: 'Admin review notes for approval'
    })
    reviewNotes?: string

    @ApiProperty({ 
        example: 'https://www.example.com/game-image.jpg',
        required: false,
        description: 'Image URL for the game (if not provided in proposal)'
    })
    imageUrl?: string

    @ApiProperty({ 
        example: 120,
        required: false,
        description: 'Average duration in minutes (if not provided in proposal)'
    })
    gameAvgDuration?: number

    @ApiProperty({ 
        example: 3,
        required: false,
        description: 'Minimum players (if not provided in proposal)'
    })
    minPlayers?: number

    @ApiProperty({ 
        example: 4,
        required: false,
        description: 'Maximum players (if not provided in proposal)'
    })
    maxPlayers?: number

    @ApiProperty({ 
        example: { en: 'Catan', es: 'Catan' },
        required: false,
        description: 'Game title translations'
    })
    translations?: Record<SupportedLanguage, string>

    @ApiProperty({ 
        example: [1, 2, 3],
        required: false,
        description: 'Tag IDs to assign to the game'
    })
    tagIds?: number[]
}

export class RejectGameProposalBody {
    @ApiProperty({ 
        example: 'This game is already in our database',
        description: 'Admin review notes explaining the rejection'
    })
    reviewNotes: string
}

export class AdminGameProposalsResponseDto {
    @ApiProperty({ 
        description: 'Array of game proposals with submitter and reviewer information',
        type: [GameProposalCompleteDto]
    })
    proposals: Array<GameProposalCompleteDto>

    @ApiProperty({ 
        description: 'Pagination information',
        type: BrowseGamesPaginationDto
    })
    pagination: BrowseGamesPaginationDto
} 
