import { ApiProperty, OmitType } from '@nestjs/swagger'

// base gamePlaySession as it comes from db
export class GamePlaySessionDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    id: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: number

    @ApiProperty({ example: '2022-03-07T16:00:00.000Z' })
    createdAt: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateGamePlaySessionBody extends OmitType(GamePlaySessionDto, ['id', 'createdAt']) {}
