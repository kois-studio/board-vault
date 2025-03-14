import { ApiProperty, OmitType } from '@nestjs/swagger'

import { GameDto } from './game.type'

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
export class CreateGameReviewBody extends OmitType(GameReviewDto, ['reviewDate']) {}

export class GameReviewWithGameDataDto extends GameReviewDto {
    @ApiProperty({ type: GameDto })
    gameData: GameDto
}
