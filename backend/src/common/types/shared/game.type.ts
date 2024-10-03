import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

// Base User as it comes from the database
export class GameDto {
    @ApiProperty({ example: 12345, description: 'The unique identifier for the game.' })
    id: number

    @ApiProperty({ example: 'Catan', description: "The game's title." })
    title: string

    @ApiProperty({ example: 'https://www.example.com/image.jpg', description: 'The URL of the game image.' })
    imageUrl: string

    @ApiProperty({ example: 120, description: 'The average duration of the game in minutes.' })
    gameAvgDuration: number

    @ApiProperty({ example: 3, description: 'The minimum number of players required to play the game.' })
    minPlayers: number

    @ApiProperty({ example: 4, description: 'The maximum number of players that can play the game.' })
    maxPlayers: number
}

// POST requests --> no db generated props
export class CreateGameBody extends OmitType(GameDto, ['id']) {}

// PUT requests --> you can only update the game name
export class UpdateGameBody extends PartialType(PickType(GameDto, ['title', 'imageUrl', 'gameAvgDuration', 'minPlayers', 'maxPlayers'])) {}
