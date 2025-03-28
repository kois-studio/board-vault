import { ApiProperty } from '@nestjs/swagger'

export class GameTranslationDto {
    @ApiProperty({ example: 1 })
    gameId: number

    @ApiProperty({ example: 'en' })
    languageCode: string

    @ApiProperty({ example: 'Game Title' })
    title: string

    @ApiProperty({ example: 'game-title' })
    normalizedTitle: string
}
