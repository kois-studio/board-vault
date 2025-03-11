import { ApiProperty, OmitType } from '@nestjs/swagger'
import { GameDto } from './game.type'
import { MeetDto } from './meet.type'
import { UserGetDto } from './user.type'

export class MeetAccountGameDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Meeting.' })
    meetId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Group.' })
    gameId: number
}

export class HistoryRecordDto extends OmitType(MeetAccountGameDto, ['gameId', 'meetId']) {
    @ApiProperty({ type: GameDto, description: 'The game data.' })
    gameData: GameDto

    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [UserGetDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<UserGetDto>
}
