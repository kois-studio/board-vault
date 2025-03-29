import { ApiProperty } from '@nestjs/swagger'

export type SupportedLanguage = 'en'

export class GameTranslationDto {
    @ApiProperty({ example: 1 })
    gameId: number

    @ApiProperty({ example: 'en' })
    languageCode: SupportedLanguage

    @ApiProperty({ example: 'Game Title' })
    title: string

    @ApiProperty({ example: 'game-title' })
    normalizedTitle: string
}
