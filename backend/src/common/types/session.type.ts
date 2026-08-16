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

export class SessionStatusUpdatedDto {
    @ApiProperty({ example: 12345 })
    sessionId: number

    @ApiProperty({ example: 'active', enum: ['scheduled', 'active', 'completed', 'cancelled'] })
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
}
