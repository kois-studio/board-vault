import { ApiProperty } from '@nestjs/swagger'
import { IsInt, Max, Min } from 'class-validator'

import { GameCompleteDto } from './game.type.js'

/**
 * base GameReview as it comes from db
 */
export class GameReviewDto {
    @ApiProperty({ example: 12345 })
    accountId: number

    @ApiProperty({ example: 12345 })
    gameId: number

    @ApiProperty({ example: 8 })
    review: number

    @ApiProperty({ example: '2022-03-07T16:00:00.000Z' })
    reviewDate: string
}

/**
 * POST requests --> no db generated props
 */
export class CreateGameReviewBody {
    @ApiProperty({ example: 8, minimum: 0, maximum: 10 })
    @IsInt()
    @Min(0)
    @Max(10)
    review: number
}

export class GameReviewWithGameDataDto extends GameReviewDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto
}
