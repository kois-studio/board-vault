import { ApiProperty } from '@nestjs/swagger'

// Base GamePlaySession as it comes from the DB
export class GamePlaySessionDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: number

    @ApiProperty({ example: 106, description: 'The unique identifier for the Meet.' })
    meetId: number
}
