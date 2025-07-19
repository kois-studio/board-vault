import { ApiProperty } from '@nestjs/swagger'

import { UserGetDto } from './user.type'

/**
 * Base GameProposal as it comes from db
 */
export class GameProposalDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 1, description: 'Account ID that submitted the proposal' })
    submittedBy: number

    @ApiProperty({ 
        example: 'pending', 
        enum: ['pending', 'approved', 'rejected', 'duplicate'],
        description: 'Current status of the proposal'
    })
    status: 'pending' | 'approved' | 'rejected' | 'duplicate'

    @ApiProperty({ example: 'Catan', description: 'Game title' })
    title: string

    @ApiProperty({ 
        example: 'https://www.example.com/image.jpg', 
        nullable: true,
        description: 'Game image URL'
    })
    imageUrl: string | null

    @ApiProperty({ 
        example: 120, 
        nullable: true,
        description: 'Average duration of the game in minutes'
    })
    gameAvgDuration: number | null

    @ApiProperty({ 
        example: 3, 
        nullable: true,
        description: 'Minimum number of players required'
    })
    minPlayers: number | null

    @ApiProperty({ 
        example: 4, 
        nullable: true,
        description: 'Maximum number of players allowed'
    })
    maxPlayers: number | null

    @ApiProperty({ 
        example: '["strategy", "family"]', 
        nullable: true,
        description: 'Proposed tags as JSON string'
    })
    proposedTags: string | null

    @ApiProperty({ 
        example: 'A great family strategy game', 
        nullable: true,
        description: 'User notes about the game'
    })
    notes: string | null

    @ApiProperty({ 
        example: 2, 
        nullable: true,
        description: 'Admin account ID that reviewed the proposal'
    })
    reviewedBy: number | null

    @ApiProperty({ 
        example: '2024-01-15T10:30:00Z', 
        nullable: true,
        description: 'When the proposal was reviewed'
    })
    reviewedAt: string | null

    @ApiProperty({ 
        example: 'Approved - great game for our collection', 
        nullable: true,
        description: 'Admin review notes'
    })
    reviewNotes: string | null

    @ApiProperty({ 
        example: 123, 
        nullable: true,
        description: 'ID of the created game if approved'
    })
    createdGameId: number | null

    @ApiProperty({ 
        example: '2024-01-10T15:45:00Z',
        description: 'When the proposal was submitted'
    })
    submittedAt: string
}

/**
 * Request body for creating a new game proposal
 */
export class CreateGameProposalBody {
    @ApiProperty({ example: 'Catan', description: 'Game title' })
    title: string

    @ApiProperty({ 
        example: 'https://www.example.com/image.jpg', 
        required: false,
        description: 'Game image URL'
    })
    imageUrl?: string

    @ApiProperty({ 
        example: 120, 
        required: false,
        description: 'Average duration of the game in minutes'
    })
    gameAvgDuration?: number

    @ApiProperty({ 
        example: 3, 
        required: false,
        description: 'Minimum number of players required'
    })
    minPlayers?: number

    @ApiProperty({ 
        example: 4, 
        required: false,
        description: 'Maximum number of players allowed'
    })
    maxPlayers?: number

    @ApiProperty({ 
        example: '["strategy", "family"]', 
        required: false,
        description: 'Proposed tags as JSON string'
    })
    proposedTags?: string

    @ApiProperty({ 
        example: 'A great family strategy game', 
        required: false,
        description: 'User notes about the game'
    })
    notes?: string
}

/**
 * Request body for updating a game proposal (admin review)
 */
export class UpdateGameProposalBody {
    @ApiProperty({ 
        example: 'approved', 
        enum: ['pending', 'approved', 'rejected', 'duplicate'],
        required: false,
        description: 'New status for the proposal'
    })
    status?: 'pending' | 'approved' | 'rejected' | 'duplicate'

    @ApiProperty({ 
        example: 'Approved - great game for our collection', 
        required: false,
        description: 'Admin review notes'
    })
    reviewNotes?: string

    @ApiProperty({ 
        example: 123, 
        required: false,
        description: 'ID of the created game if approved'
    })
    createdGameId?: number
}

/**
 * Game proposal with submitter ID only
 */
export class GameProposalWithSubmitterDto extends GameProposalDto {
    @ApiProperty({ 
        example: 1,
        description: 'ID of the user who submitted the proposal'
    })
    submitterId: number
}

/**
 * Game proposal with reviewer ID only
 */
export class GameProposalWithReviewerDto extends GameProposalDto {
    @ApiProperty({ 
        example: 2,
        nullable: true,
        description: 'ID of the admin who reviewed the proposal'
    })
    reviewerId?: number
}

/**
 * Complete game proposal with both submitter and reviewer IDs
 */
export class GameProposalCompleteDto extends GameProposalDto {
    @ApiProperty({ 
        example: 1,
        description: 'ID of the user who submitted the proposal'
    })
    submitterId: number

    @ApiProperty({ 
        example: 2,
        nullable: true,
        description: 'ID of the admin who reviewed the proposal'
    })
    reviewerId?: number
}

/**
 * Game proposal with full submitter information (when needed)
 */
export class GameProposalWithSubmitterDetailsDto extends GameProposalDto {
    @ApiProperty({ 
        type: UserGetDto,
        description: 'Full information about the user who submitted the proposal'
    })
    submitter: UserGetDto
}

/**
 * Game proposal with full reviewer information (when needed)
 */
export class GameProposalWithReviewerDetailsDto extends GameProposalDto {
    @ApiProperty({ 
        type: UserGetDto,
        nullable: true,
        description: 'Full information about the admin who reviewed the proposal'
    })
    reviewer?: UserGetDto
} 
