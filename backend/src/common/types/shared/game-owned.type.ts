import { ApiProperty } from '@nestjs/swagger'

// Base User as it comes from the database
export class GameOwnedDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: string
}
