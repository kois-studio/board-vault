import { ApiProperty } from '@nestjs/swagger'

/**
 * Wishlisted game
 */
export class WishlistedGameDto {
    @ApiProperty({ example: 1 })
    accountId: number

    @ApiProperty({ example: 1 })
    gameId: number
    
    @ApiProperty({ example: '2024-01-01' })
    dateAdded: string

    @ApiProperty({ example: 3 })
    priority: number

    @ApiProperty({ example: 'Recommended by a friend' })
    notes: string | null
}

export class WishlistResponseDto {
    @ApiProperty({ example: true, description: 'Whether the game is wishlisted.' })
    isWishlisted: boolean
}
