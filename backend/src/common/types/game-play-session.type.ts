import { ApiProperty, OmitType } from '@nestjs/swagger'
import { GameDto } from './game.type'
import { MeetDto } from './meet.type'

// Base GamePlaySession as it comes from the DB
export class GamePlaySessionDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: number

    @ApiProperty({ example: 106, description: 'The unique identifier for the Meet.' })
    meetId: number
}

export class GamePlayHistoryDto extends OmitType(GamePlaySessionDto, ['gameId', 'meetId']) {
    @ApiProperty({ type: GameDto, description: 'The game data.' })
    gameData: GameDto

    @ApiProperty({ type: MeetDto, description: 'The meet data.' })
    meetData: MeetDto
}
