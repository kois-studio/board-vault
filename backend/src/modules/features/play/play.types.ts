import { ApiProperty } from '@nestjs/swagger'
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

import { GameCompleteDto } from '../../../common/types/game.type'
import { MeetDto } from '../../../common/types/meet.type'
import { UserPublicDto } from '../../../common/types/user.type'

class GamePlayedDto {
    @ApiProperty({ type: GameCompleteDto, description: 'The game data.' })
    gameData: GameCompleteDto

    @ApiProperty({ type: [UserPublicDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<UserPublicDto>
}

export class HistoryRecordDto {
    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [GamePlayedDto], description: 'The games played in that meet.' })
    gamesPlayed: Array<GamePlayedDto>
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
}

export class RecommendationExplanationDto {
    @ApiProperty({ example: ['Owned by 2 of 3 selected attendees', 'Fits 3 players'] })
    reasons: Array<string>

    @ApiProperty({ example: 2 })
    attendeeOwnerCount: number

    @ApiProperty({ example: 3 })
    attendeeCount: number

    @ApiProperty({ example: 8.5, nullable: true })
    averageReview: number | null

    @ApiProperty({ example: '2026-08-01T19:30:00.000Z', nullable: true })
    lastPlayedAt: string | null
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

    @ApiProperty({ example: 120, nullable: true })
    availableMinutes: number | null

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

export class RecommendationFeedbackDto {
    @ApiProperty({ example: true })
    success: true
}
