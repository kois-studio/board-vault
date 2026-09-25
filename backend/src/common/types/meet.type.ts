import { ApiProperty } from '@nestjs/swagger'

import { GameDto } from './game.type'
import { UserGetDto } from './user.type'

export class MeetDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    groupId: number

    @ApiProperty({ example: 12345 })
    createdBy: number

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    meetDate: string

    @ApiProperty({ example: true })
    isConfirmed: boolean

    @ApiProperty({ example: 'completed', enum: ['scheduled', 'active', 'completed', 'cancelled'] })
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'

    @ApiProperty({ example: 'UTC' })
    timezone: string

    @ApiProperty({ example: 'Tried the new co-op expansion.', required: false, nullable: true })
    notes: string | null
}

export class MeetAttendeeStatusDto {
    @ApiProperty({ example: 12345 })
    accountId: number

    @ApiProperty({ example: 'accepted', enum: ['pending', 'accepted', 'declined'] })
    rsvpStatus: 'pending' | 'accepted' | 'declined'

    @ApiProperty({ example: 'unknown', enum: ['unknown', 'attended', 'absent'] })
    attendanceStatus: 'unknown' | 'attended' | 'absent'
}

export class MeetPlayedGameParticipantsDto {
    @ApiProperty({ example: 42 })
    gameId: number

    @ApiProperty({ example: [1, 2] })
    participantIds: Array<number>
}

export class MeetPersonAttendeeStatusDto {
    @ApiProperty({ example: 12345 })
    groupPersonId: number

    @ApiProperty({ example: 'accepted', enum: ['pending', 'accepted', 'declined'] })
    rsvpStatus: 'pending' | 'accepted' | 'declined'

    @ApiProperty({ example: 'unknown', enum: ['unknown', 'attended', 'absent'] })
    attendanceStatus: 'unknown' | 'attended' | 'absent'
}

export class MeetWithAttendeesAndGames extends MeetDto {
    @ApiProperty({ type: [UserGetDto], description: 'The attendees of the meet.' })
    attendees: Array<UserGetDto['id']>

    @ApiProperty({ type: [MeetAttendeeStatusDto], description: 'RSVP and final attendance state for each invited member.' })
    attendeeStatuses: Array<MeetAttendeeStatusDto>

    @ApiProperty({ type: [GameDto], description: 'The games played at the meet.' })
    playedGames: Array<GameDto['id']>

    @ApiProperty({ type: [GameDto], description: 'The games planned for the meet.' })
    plannedGames: Array<GameDto['id']>

    @ApiProperty({ type: [Number], description: 'The games planned but not played in the meet.' })
    skippedGames: Array<GameDto['id']>

    @ApiProperty({ type: [MeetPlayedGameParticipantsDto], description: 'The members recorded as participants for each played game.' })
    playedGameParticipants: Array<MeetPlayedGameParticipantsDto>

    @ApiProperty({ type: [Number], description: 'GroupPerson IDs participating in this session.' })
    participants: Array<number>

    @ApiProperty({ type: [MeetPersonAttendeeStatusDto] })
    participantStatuses: Array<MeetPersonAttendeeStatusDto>

    @ApiProperty({ type: [MeetPlayedGameParticipantsDto] })
    playedGamePersonParticipants: Array<MeetPlayedGameParticipantsDto>
}
