import { ApiProperty } from '@nestjs/swagger'

// base GameOwned as it comes from db
export class GameOwnedDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: string
}
