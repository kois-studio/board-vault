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
}

export class MeetWithAttendeesAndGames extends MeetDto {
    @ApiProperty({ type: [UserGetDto], description: 'The attendees of the meet.' })
    attendees: Array<UserGetDto['id']>

    @ApiProperty({ type: [GameDto], description: 'The games played at the meet.' })
    playedGames: Array<GameDto['id']>

    @ApiProperty({ type: [GameDto], description: 'The games planned for the meet.' })
    plannedGames: Array<GameDto['id']>

    @ApiProperty({ type: [Number], description: 'The games planned but not played in the meet.' })
    skippedGames: Array<GameDto['id']>
}
