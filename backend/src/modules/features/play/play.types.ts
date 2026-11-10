import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

import { GameCompleteDto } from '../../../common/types/game.type.js'
import { GROUP_PERSON_STANDINGS, type GroupPersonStanding } from '../../../common/types/group-person.type.js'
import { MeetDto } from '../../../common/types/meet.type.js'
import { UserPublicDto } from '../../../common/types/user.type.js'
import { AvatarDto } from '../../../common/types/user.type.js'

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

    @ApiProperty({ enum: GROUP_PERSON_STANDINGS, description: 'Whether they are still in the group, left it, or deleted their account.' })
    standing: GroupPersonStanding
}

/** An account in a session recorded with accounts, and where it stands in that group now. */
export class HistoryUserDto extends UserPublicDto {
    @ApiProperty({ enum: GROUP_PERSON_STANDINGS, description: 'Whether they are still in the group, left it, or deleted their account.' })
    standing: GroupPersonStanding
}

class GamePlayedDto {
    @ApiProperty({ required: false, description: 'Number of separate plays when greater than one.' })
    playCount?: number

    @ApiProperty({ type: GameCompleteDto, description: 'The game data.' })
    gameData: GameCompleteDto

    @ApiProperty({ type: [HistoryUserDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<HistoryUserDto>

    @ApiProperty({ type: [HistoryPersonDto], required: false })
    playedByPeople?: Array<HistoryPersonDto>

    @ApiProperty({ example: [1], description: 'Accounts recorded as winning this game (sessions recorded with accounts).' })
    winnerAccountIds: Array<number>

    @ApiProperty({ example: [10], description: 'Group people recorded as winning this game.' })
    winnerPersonIds: Array<number>
}

export class HistoryRecordDto {
    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [GamePlayedDto], description: 'The games played in that meet.' })
    gamesPlayed: Array<GamePlayedDto>

    @ApiProperty({ type: [HistoryUserDto], description: 'The group members recorded as actually attending the session.' })
    attendedBy: Array<HistoryUserDto>

    @ApiProperty({ type: [HistoryPersonDto], required: false })
    attendedByPeople?: Array<HistoryPersonDto>
}

/** Nights shown per page of history when the caller does not say (#252). */
export const HISTORY_PAGE_SIZE = 20
/** The most nights one page of history may hold. */
export const HISTORY_PAGE_MAX = 50

/** Which part of the caller's history to read: newest first, a page at a time (#252). */
export class HistoryQuery {
    @ApiPropertyOptional({ description: 'Return nights older than this one: the id of the last night of the previous page.', example: 120 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    before?: number

    @ApiPropertyOptional({ description: `Nights per page, 1 to ${HISTORY_PAGE_MAX}; ${HISTORY_PAGE_SIZE} when left out.`, example: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(HISTORY_PAGE_MAX)
    limit?: number

    @ApiPropertyOptional({ description: 'Only nights of this group.', example: 7 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    groupId?: number

    @ApiPropertyOptional({ description: 'Only nights where this game was played.', example: 42 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    gameId?: number
}

export class HistoryPageDto {
    @ApiProperty({ type: [HistoryRecordDto], description: 'Completed nights, newest first.' })
    entries: Array<HistoryRecordDto>

    @ApiProperty({ example: true, description: 'True when older nights remain: ask again with `before` set to the last id.' })
    hasMore: boolean
}

/** Which part of the caller's history to sum up. */
export class HistorySummaryQuery {
    @ApiPropertyOptional({ description: 'Only nights of this group.', example: 7 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    groupId?: number

    @ApiPropertyOptional({ description: 'Only nights this game was played on.', example: 42 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    gameId?: number
}

export class HistoryMostPlayedDto {
    @ApiProperty({ type: GameCompleteDto })
    game: GameCompleteDto

    @ApiProperty({ example: 4, description: 'Nights it was played.' })
    nights: number
}

export class HistoryMyGameDto {
    @ApiProperty({ type: GameCompleteDto })
    game: GameCompleteDto

    @ApiProperty({ example: 6, description: 'Times the caller played it, counting every play of a night.' })
    plays: number

    @ApiProperty({ example: 2, description: 'Nights the caller was recorded as winning it.' })
    wins: number
}

/** Totals over the whole of the caller's history, so no screen needs every night to count them (#252). */
export class HistorySummaryDto {
    @ApiProperty({ example: 12, description: 'Completed nights in the history.' })
    nights: number

    @ApiProperty({ example: 30, description: 'Games played across those nights, counting every play.' })
    gamesPlayed: number

    @ApiProperty({ example: 9, description: 'Different games played.' })
    uniqueGames: number

    @ApiProperty({ example: 6, description: 'Different people who came or played, each counted once.' })
    people: number

    @ApiProperty({
        type: HistoryMostPlayedDto,
        nullable: true,
        description: 'The game played on the most nights, ties broken by title; null with no games.',
    })
    mostPlayed: HistoryMostPlayedDto | null

    @ApiProperty({ type: [HistoryMyGameDto], description: 'The five games the caller played most, then won most.' })
    myMostPlayed: Array<HistoryMyGameDto>
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

/** Why a game is recommended, as a fact the app words in the page's language (ADR-0024). */
export const RECOMMENDATION_REASON_CODES = [
    'owned_by',
    'fits_players',
    'duration',
    'duration_unknown',
    'rating',
    'no_rating',
    'interested',
    'passed_before',
    'preferences_favor',
    'marked_avoid',
    'not_played_yet',
    'played_before',
    'strong_rating',
    'shared_shelf',
] as const
export type RecommendationReasonCode = (typeof RECOMMENDATION_REASON_CODES)[number]

export class RecommendationReasonDto {
    @ApiProperty({ enum: RECOMMENDATION_REASON_CODES, example: 'owned_by' })
    code: RecommendationReasonCode

    @ApiProperty({
        example: { owners: 2, attendees: 3 },
        description:
            'The numbers the reason needs: owners and attendees (owned_by; people is 1 when they are group people), players (fits_players), minutes (duration), rating (rating), count (interested, passed_before).',
        required: false,
    })
    values?: Record<string, number>
}

/** Why nothing could be recommended. */
export const NO_RESULT_REASON_CODES = ['no_owned_games', 'no_player_fit', 'no_duration_fit', 'no_titled_games', 'no_people_games'] as const
export type NoResultReasonCode = (typeof NO_RESULT_REASON_CODES)[number]

export class NoResultReasonDto {
    @ApiProperty({ enum: NO_RESULT_REASON_CODES, example: 'no_player_fit' })
    code: NoResultReasonCode

    @ApiProperty({
        example: { players: 5 },
        description: 'players (no_player_fit, no_duration_fit), minutes (no_duration_fit).',
        required: false,
    })
    values?: Record<string, number>
}

export class RecommendationExplanationDto {
    @ApiProperty({ example: ['Owned by 2 of 3 selected people', 'Fits 3 players'] })
    reasons: Array<string>

    @ApiProperty({ type: [RecommendationReasonDto], description: 'The same reasons, as codes; `reasons` is their English.' })
    reasonCodes: Array<RecommendationReasonDto>

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

    @ApiProperty({ type: NoResultReasonDto, nullable: true, description: 'The same reason, as a code; `noResultReason` is its English.' })
    noResultReasonCode: NoResultReasonDto | null
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
