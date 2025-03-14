import { ApiProperty } from '@nestjs/swagger'

import { GameDto } from '../../../common/types/game.type'
import { MeetDto } from '../../../common/types/meet.type'
import { UserGetDto } from '../../../common/types/user.type'

export class HistoryRecordDto {
    @ApiProperty({ type: GameDto, description: 'The game data.' })
    gameData: GameDto

    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [UserGetDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<UserGetDto>
}
