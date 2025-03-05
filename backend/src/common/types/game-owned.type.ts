import { ApiProperty } from '@nestjs/swagger'

// base GameOwned as it comes from db
export class GameOwnedDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the Account.' })
    accountId: number

    @ApiProperty({ example: 12345, description: 'The unique identifier for the Game.' })
    gameId: number

    @ApiProperty({ example: 12345, description: 'The price of the game when purchased.' })
    purchasePrice: number

    @ApiProperty({ example: '2021-01-01', description: 'The date the game was purchased.' })
    purchaseDate: Date

    @ApiProperty({ example: 'I got this as a gift from my friend.', description: 'Any notes about the purchase.' })
    purchaseNotes: string
}
