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
}

export class MeetWithAttendeesAndGames extends MeetDto {
    @ApiProperty({ type: [UserGetDto], description: 'The attendees of the meet.' })
    attendees: Array<UserGetDto['id']>

    @ApiProperty({ type: [GameDto], description: 'The games played at the meet.' })
    playedGames: Array<GameDto['id']>
}

export class MeetCreatedDto {
    @ApiProperty({ example: 12345 })
    meetId: number
}
