import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator'

import { IsArtworkUrl } from '../validators/is-artwork-url.js'

import { UserPublicDto } from './user.type.js'

/**
 * Base GameProposal as it comes from db
 */
export type GameProposalAddTo = 'shelf' | 'wishlist'

/** A title of a proposed game in another language. */
export class ProposalOtherTitleDto {
    @ApiProperty({ example: 'es', description: 'BCP 47 language of the title.' })
    @IsString()
    @MaxLength(16)
    languageCode: string

    @ApiProperty({ example: 'Los colonos de Catán' })
    // Trimmed first, so a title of only spaces is empty and rejected.
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string
}

export class GameProposalDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 1, description: 'Account ID that submitted the proposal' })
    submittedBy: number

    @ApiProperty({
        example: 'pending',
        enum: ['pending', 'approved', 'rejected', 'duplicate'],
        description: 'Current status of the proposal',
    })
    status: 'pending' | 'approved' | 'rejected' | 'duplicate'

    @ApiProperty({ example: 'Catan', description: 'Game title' })
    title: string

    @ApiProperty({ example: 'en', description: 'The language of `title`. Proposals made before languages were recorded read as English.' })
    titleLanguage: string

    @ApiProperty({ type: [ProposalOtherTitleDto], description: "The game's title in other languages, when the proposer knew them." })
    otherTitles: Array<ProposalOtherTitleDto>

    @ApiProperty({
        example: 'https://www.example.com/image.jpg',
        nullable: true,
        description: 'Game image URL',
    })
    imageUrl: string | null

    @ApiProperty({
        example: 120,
        nullable: true,
        description: 'Average duration of the game in minutes',
    })
    gameAvgDuration: number | null

    @ApiProperty({
        example: 3,
        nullable: true,
        description: 'Minimum number of players required',
    })
    minPlayers: number | null

    @ApiProperty({
        example: 4,
        nullable: true,
        description: 'Maximum number of players allowed',
    })
    maxPlayers: number | null

    @ApiProperty({
        example: '["strategy", "family"]',
        nullable: true,
        description: 'Proposed tags as JSON string',
    })
    proposedTags: string | null

    @ApiProperty({
        example: 'A great family strategy game',
        nullable: true,
        description: 'User notes about the game',
    })
    notes: string | null

    @ApiProperty({
        example: 2,
        nullable: true,
        description: 'Admin account ID that reviewed the proposal',
    })
    reviewedBy: number | null

    @ApiProperty({
        example: '2024-01-15T10:30:00Z',
        nullable: true,
        description: 'When the proposal was reviewed',
    })
    reviewedAt: string | null

    @ApiProperty({
        example: 'Approved - great game for our collection',
        nullable: true,
        description: 'Admin review notes',
    })
    reviewNotes: string | null

    @ApiProperty({
        example: 123,
        nullable: true,
        description: 'ID of the created game if approved',
    })
    createdGameId: number | null

    @ApiProperty({
        example: '2024-01-10T15:45:00Z',
        description: 'When the proposal was submitted',
    })
    submittedAt: string

    @ApiProperty({
        enum: ['shelf', 'wishlist'],
        nullable: true,
        description: 'Where the approved game goes for the proposer: their shelf, their wishlist, or neither.',
    })
    addTo: GameProposalAddTo | null
}

/**
 * Request body for creating a new game proposal
 */
export class CreateGameProposalBody {
    @ApiProperty({ example: 'Catan', description: 'Game title' })
    // Trimmed first, so a title of only spaces is empty and rejected.
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string

    @ApiProperty({
        example: 'de',
        required: false,
        description: 'The language of `title`, such as "de" or "pt-BR". Default: the reader\'s interface language (Accept-Language).',
    })
    @IsOptional()
    @IsString()
    @MaxLength(16)
    titleLanguage?: string

    @ApiProperty({
        type: [ProposalOtherTitleDto],
        required: false,
        description: "The game's title in other languages: at most 10, one per language, none in the language of `title`.",
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => ProposalOtherTitleDto)
    otherTitles?: ProposalOtherTitleDto[]

    @ApiProperty({
        example: 'https://www.example.com/image.jpg',
        required: false,
        description: 'Game image URL',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2048)
    @IsArtworkUrl()
    imageUrl?: string

    @ApiProperty({
        example: 120,
        required: false,
        description: 'Average duration of the game in minutes',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    gameAvgDuration?: number

    @ApiProperty({
        example: 3,
        required: false,
        description: 'Minimum number of players required',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    minPlayers?: number

    @ApiProperty({
        example: 4,
        required: false,
        description: 'Maximum number of players allowed',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxPlayers?: number

    @ApiProperty({
        example: '["strategy", "family"]',
        required: false,
        description: 'Proposed tags as JSON string',
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    proposedTags?: string

    @ApiProperty({
        example: 'A great family strategy game',
        required: false,
        description: 'User notes about the game',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string

    @ApiProperty({
        enum: ['shelf', 'wishlist'],
        required: false,
        description: 'On approval, add the game to your shelf (you own it) or your wishlist. Leave out for neither.',
    })
    @IsOptional()
    @IsIn(['shelf', 'wishlist'])
    addTo?: GameProposalAddTo
}

/**
 * Request body for updating a game proposal (admin review)
 */
export class UpdateGameProposalBody {
    @ApiProperty({
        example: 'approved',
        enum: ['pending', 'approved', 'rejected', 'duplicate'],
        required: false,
        description: 'New status for the proposal',
    })
    @IsOptional()
    @IsIn(['pending', 'approved', 'rejected', 'duplicate'])
    status?: 'pending' | 'approved' | 'rejected' | 'duplicate'

    @ApiProperty({
        example: 'Approved - great game for our collection',
        required: false,
        description: 'Admin review notes',
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reviewNotes?: string

    @ApiProperty({
        example: 123,
        required: false,
        description: 'ID of the created game if approved',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    createdGameId?: number
}

/**
 * Game proposal with submitter ID only
 */
export class GameProposalWithSubmitterDto extends GameProposalDto {
    @ApiProperty({
        example: 1,
        description: 'ID of the user who submitted the proposal',
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
        description: 'ID of the admin who reviewed the proposal',
    })
    reviewerId?: number
}

/**
 * Complete game proposal with both submitter and reviewer IDs
 */
export class GameProposalCompleteDto extends GameProposalDto {
    @ApiProperty({
        example: 1,
        description: 'ID of the user who submitted the proposal',
    })
    submitterId: number

    @ApiProperty({
        example: 2,
        nullable: true,
        description: 'ID of the admin who reviewed the proposal',
    })
    reviewerId?: number
}

/**
 * Game proposal with full submitter information (when needed)
 */
export class GameProposalWithSubmitterDetailsDto extends GameProposalDto {
    @ApiProperty({
        type: UserPublicDto,
        description: 'Public identity of the user who submitted the proposal',
    })
    submitter: UserPublicDto
}

/**
 * Game proposal with full reviewer information (when needed)
 */
export class GameProposalWithReviewerDetailsDto extends GameProposalDto {
    @ApiProperty({
        type: UserPublicDto,
        nullable: true,
        description: 'Public identity of the admin who reviewed the proposal',
    })
    reviewer?: UserPublicDto
}
