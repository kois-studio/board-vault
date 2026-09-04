import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsISO8601,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator'

export class PlaySessionGameBody {
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
    participantIds: Array<number>
}

export class CreatePlaySessionBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: '2026-08-16T19:30:00.000Z' })
    @IsISO8601()
    sessionDate: string

    @ApiProperty({ example: 'Europe/Madrid' })
    @IsString()
    @MaxLength(64)
    timezone: string

    @ApiProperty({ example: 'Tried the new co-op expansion.', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string

    @ApiProperty({ example: [1, 2] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendeeIds: Array<number>

    @ApiProperty({ type: [PlaySessionGameBody] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => PlaySessionGameBody)
    games: Array<PlaySessionGameBody>
}

export class SessionCreatedDto {
    @ApiProperty({ example: 12345 })
    sessionId: number

    @ApiProperty({ example: 'completed' })
    status: 'completed'
}

export class CreateScheduledSessionBody {
    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: '2026-08-21T19:30:00.000Z' })
    @IsISO8601()
    sessionDate: string

    @ApiProperty({ example: 'Europe/Madrid' })
    @IsString()
    @MaxLength(64)
    timezone: string

    @ApiProperty({ example: 'Bring the new co-op expansion.', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string

    @ApiProperty({ example: [1, 2], required: false, description: 'Selected group members attending the session.' })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendeeIds?: Array<number>

    @ApiProperty({ example: [42, 84], required: false })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    plannedGameIds?: Array<number>
}

export class ScheduledSessionCreatedDto {
    @ApiProperty({ example: 12345 })
    sessionId: number

    @ApiProperty({ example: 'scheduled' })
    status: 'scheduled'
}

export class UpdateSessionStatusBody {
    @ApiProperty({ example: 'active', enum: ['active', 'completed', 'cancelled'] })
    @IsIn(['active', 'completed', 'cancelled'])
    status: 'active' | 'completed' | 'cancelled'
}

export class UpdateSessionAttendeesBody {
    @ApiProperty({ example: [1, 2] })
    @IsArray()
    @ArrayUnique()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendeeIds: Array<number>
}

export class SessionStatusUpdatedDto {
    @ApiProperty({ example: 12345 })
    sessionId: number

    @ApiProperty({ example: 'active', enum: ['scheduled', 'active', 'completed', 'cancelled'] })
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
}

export class SessionAttendeesUpdatedDto {
    @ApiProperty({ example: 12345 })
    sessionId: number

    @ApiProperty({ example: [1, 2] })
    attendeeIds: Array<number>
}

export class UpdateSessionShortlistBody {
    @ApiProperty({
        example: [42, 84],
        description: 'Games the group wants to consider for this session. Use an empty array to clear the shortlist.',
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    plannedGameIds: Array<number>
}

export class SessionShortlistUpdatedDto {
    @ApiProperty({ example: 12 })
    sessionId: number

    @ApiProperty({ example: [42, 84] })
    plannedGameIds: Array<number>
}

export class UpdateSessionPlayedGamesBody {
    @ApiProperty({
        example: [42, 84],
        description: 'Games actually played. Use an empty array to record that none of the tracked games were played.',
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    playedGameIds: Array<number>

    @ApiProperty({
        type: [PlaySessionGameBody],
        required: false,
        description: 'Optional per-game participants. Older clients may omit this and record only the games played.',
    })
    @IsOptional()
    @IsArray()
    @ArrayUnique((game: PlaySessionGameBody) => game.gameId)
    @ValidateNested({ each: true })
    @Type(() => PlaySessionGameBody)
    games?: Array<PlaySessionGameBody>
}

export class SessionPlayedGamesUpdatedDto {
    @ApiProperty({ example: 12 })
    sessionId: number

    @ApiProperty({ example: [42, 84] })
    playedGameIds: Array<number>

    @ApiProperty({ example: [99] })
    skippedGameIds: Array<number>

    @ApiProperty({ type: [PlaySessionGameBody], description: 'The participants recorded for each played game.' })
    playedGameParticipants: Array<PlaySessionGameBody>
}

export class UpdateSessionRsvpBody {
    @ApiProperty({ example: 'accepted', enum: ['accepted', 'declined'] })
    @IsIn(['accepted', 'declined'])
    rsvpStatus: 'accepted' | 'declined'
}

export class SessionRsvpUpdatedDto {
    @ApiProperty({ example: 12 })
    sessionId: number

    @ApiProperty({ example: 'accepted', enum: ['pending', 'accepted', 'declined'] })
    rsvpStatus: 'pending' | 'accepted' | 'declined'
}

export class UpdateSessionAttendanceBody {
    @ApiProperty({
        example: [1, 2],
        description: 'Invited members who actually attended the session. Use an empty array when nobody attended.',
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(1, { each: true })
    attendedIds: Array<number>
}

export class SessionAttendanceUpdatedDto {
    @ApiProperty({ example: 12 })
    sessionId: number

    @ApiProperty({ example: [1, 2] })
    attendedIds: Array<number>
}
