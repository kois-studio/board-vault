import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
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

/**
 * PUT requests --> editable fields
 */
export class UpdateGameReviewBody extends PartialType(PickType(GameReviewDto, ['review', 'reviewDate'])) {}

export class GameReviewAndGameData extends GameReviewDto {
    @ApiProperty({})
    gameData: GameDto
}
