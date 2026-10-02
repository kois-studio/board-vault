import { ApiProperty } from '@nestjs/swagger'
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

import { GameCompleteDto } from '../../../common/types/game.type'
import { MeetDto } from '../../../common/types/meet.type'
import { UserPublicDto } from '../../../common/types/user.type'
import { AvatarDto } from '../../../common/types/user.type'

export type RecommendationDecisionLens = 'balanced' | 'fresh' | 'favorite'

export class HistoryPersonDto {
    @ApiProperty({ example: 42 })
    id: number

    @ApiProperty({ example: 'Ana' })
    displayName: string

    @ApiProperty({ type: AvatarDto, nullable: true, description: "The person's avatar, or their linked account's when they have none." })
    avatar: AvatarDto | null

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 7,
        description: 'The linked account, also listed in attendedBy/playedBy for sessions recorded with accounts.',
    })
    accountId: number | null
}

class GamePlayedDto {
    @ApiProperty({ type: GameCompleteDto, description: 'The game data.' })
    gameData: GameCompleteDto

    @ApiProperty({ type: [UserPublicDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<UserPublicDto>

    @ApiProperty({ type: [HistoryPersonDto], required: false })
    playedByPeople?: Array<HistoryPersonDto>
}

export class HistoryRecordDto {
    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [GamePlayedDto], description: 'The games played in that meet.' })
    gamesPlayed: Array<GamePlayedDto>

    @ApiProperty({ type: [UserPublicDto], description: 'The group members recorded as actually attending the session.' })
    attendedBy: Array<UserPublicDto>

    @ApiProperty({ type: [HistoryPersonDto], required: false })
    attendedByPeople?: Array<HistoryPersonDto>
}

export class RecommendationRequestBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: [1, 2] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendeeIds: Array<number>

    @ApiProperty({ example: 120, required: false, description: 'Maximum desired game duration in minutes.' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1440)
    availableMinutes?: number

    @ApiProperty({ example: 'balanced', enum: ['balanced', 'fresh', 'favorite'], required: false })
    @IsOptional()
    @IsIn(['balanced', 'fresh', 'favorite'])
    decisionLens?: RecommendationDecisionLens
}

export class ParticipantRecommendationRequestBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: [12, 13, 14], type: [Number] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    groupPersonIds: Array<number>

    @ApiProperty({ example: 120, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1440)
    availableMinutes?: number

    @ApiProperty({ example: 'balanced', enum: ['balanced', 'fresh', 'favorite'], required: false })
    @IsOptional()
    @IsIn(['balanced', 'fresh', 'favorite'])
    decisionLens?: RecommendationDecisionLens
}

export class RecommendationExplanationDto {
    @ApiProperty({ example: ['Owned by 2 of 3 selected people', 'Fits 3 players'] })
    reasons: Array<string>

    @ApiProperty({ example: 2 })
    attendeeOwnerCount: number

    @ApiProperty({ example: 3 })
    attendeeCount: number

    @ApiProperty({ example: 8.5, nullable: true })
    averageReview: number | null

    @ApiProperty({ example: '2026-08-01T19:30:00.000Z', nullable: true })
    lastPlayedAt: string | null

    @ApiProperty({ example: 2, description: 'Selected attendees who previously marked this game as interesting.' })
    interestedCount: number

    @ApiProperty({ example: 0, description: 'Selected attendees who previously passed on this game.' })
    notForUsCount: number
}

export class RecommendationDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto

    @ApiProperty({ example: 82 })
    score: number

    @ApiProperty({ type: RecommendationExplanationDto })
    explanation: RecommendationExplanationDto
}

export class RecommendationsDto {
    @ApiProperty({ example: 7 })
    groupId: number

    @ApiProperty({ example: [1, 2] })
    attendeeIds: Array<number>

    @ApiProperty({ example: [12, 13, 14], required: false })
    participantIds?: Array<number>

    @ApiProperty({ example: 120, nullable: true })
    availableMinutes: number | null

    @ApiProperty({ example: 'balanced', enum: ['balanced', 'fresh', 'favorite'] })
    decisionLens: RecommendationDecisionLens

    @ApiProperty({ type: [RecommendationDto] })
    recommendations: Array<RecommendationDto>

    @ApiProperty({ example: 'No owned games match the selected attendees and filters.', nullable: true })
    noResultReason: string | null
}

export class RecommendationFeedbackBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    gameId: number

    @ApiProperty({ example: [1, 2] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendeeIds: Array<number>

    @ApiProperty({ example: 'not_for_us', enum: ['interested', 'not_for_us', 'played'] })
    @IsIn(['interested', 'not_for_us', 'played'])
    feedback: 'interested' | 'not_for_us' | 'played'
}

export class ParticipantRecommendationFeedbackBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    gameId: number

    @ApiProperty({ example: [12, 13] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    participantIds: Array<number>

    @ApiProperty({ example: 'not_for_us', enum: ['interested', 'not_for_us', 'played'] })
    @IsIn(['interested', 'not_for_us', 'played'])
    feedback: 'interested' | 'not_for_us' | 'played'
}

export class RecommendationFeedbackDto {
    @ApiProperty({ example: true })
    success: true
}

export class RecommendationSignalDto {
    @ApiProperty({ example: 42 })
    gameId: number

    @ApiProperty({ example: 2 })
    interestedCount: number

    @ApiProperty({ example: 0 })
    notForUsCount: number

    @ApiProperty({ example: 'interested', enum: ['interested', 'not_for_us'], nullable: true })
    yourFeedback: 'interested' | 'not_for_us' | null

    @ApiProperty({ type: [UserPublicDto], description: 'Current group members who most recently marked this game as interesting.' })
    interestedBy: Array<UserPublicDto>

    @ApiProperty({ example: '2026-09-03 20:00:00' })
    lastUpdatedAt: string
}

export class RecommendationSignalsDto {
    @ApiProperty({ example: 7 })
    groupId: number

    @ApiProperty({ type: [RecommendationSignalDto] })
    signals: Array<RecommendationSignalDto>
}
