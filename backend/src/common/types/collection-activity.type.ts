import { ApiProperty } from '@nestjs/swagger'

import { GameCompleteDto } from './game.type.js'

export class CollectionActivityDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    accountId: number

    @ApiProperty({ example: 567 })
    gameId: number

    @ApiProperty({ example: 'rated', enum: ['added', 'rated', 'wishlisted', 'unwishlisted', 'updated', 'removed'] })
    actionType: 'added' | 'rated' | 'wishlisted' | 'unwishlisted' | 'updated' | 'removed'

    @ApiProperty({
        example: '{"rating": 4.5}',
        description: 'JSON string with additional details about the action',
    })
    actionDetails: null | { rating: null | number }

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    createdAt: string
}

export class CollectionActivityWithGameDataDto extends CollectionActivityDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto
}
