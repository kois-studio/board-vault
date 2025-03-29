import { ApiProperty } from '@nestjs/swagger'

import { GameCompleteDto } from '../../../common/types/game.type'
import { MeetDto } from '../../../common/types/meet.type'
import { UserGetDto } from '../../../common/types/user.type'

class GamePlayedDto {
    @ApiProperty({ type: GameCompleteDto, description: 'The game data.' })
    gameData: GameCompleteDto

    @ApiProperty({ type: [UserGetDto], description: 'The users who played the game in that meet.' })
    playedBy: Array<UserGetDto>
}

export class HistoryRecordDto {
    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto

    @ApiProperty({ type: [GamePlayedDto], description: 'The games played in that meet.' })
    gamesPlayed: Array<GamePlayedDto>
}
