import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

/**
 * base Game as it comes from db
 */
export class GameDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 'Catan' })
    title: string

    @ApiProperty({ example: 'https://www.example.com/image.jpg' })
    imageUrl: string

    @ApiProperty({ example: 120, description: 'The average duration of the game in minutes.' })
    gameAvgDuration: number

    @ApiProperty({ example: 3, description: 'The minimum number of players required to play the game.' })
    minPlayers: number

    @ApiProperty({ example: 4, description: 'The maximum number of players that can play the game.' })
    maxPlayers: number
}

/**
 * POST requests --> no db generated props
 */
export class CreateGameBody extends OmitType(GameDto, ['id']) {}

/**
 * PUT requests --> editable fields
 */
export class UpdateGameBody extends PartialType(PickType(GameDto, ['title', 'imageUrl', 'gameAvgDuration', 'minPlayers', 'maxPlayers'])) {}
