import { ApiProperty } from '@nestjs/swagger'

import type { SupportedLanguage } from './game-translation.type'
import type { GroupDto } from './group.type'
import type { MeetDto } from './meet.type'
import type { UserGetDto } from './user.type'

/**
 * base Game as it comes from db
 */
export class GameDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 'https://www.example.com/image.jpg' })
    imageUrl: string

    @ApiProperty({ example: 120, description: 'The average duration of the game in minutes.' })
    gameAvgDuration: number

    @ApiProperty({ example: 3, description: 'The minimum number of players required to play the game.' })
    minPlayers: number

    @ApiProperty({ example: 4, description: 'The maximum number of players that can play the game.' })
    maxPlayers: number
}

export class GameCompleteDto extends GameDto {
    @ApiProperty({ example: { en: 'Game Title' } })
    titleTranslations: Record<SupportedLanguage, string>
}

/**
 * GET game view
 * when a user is logged in and access a game view
 */
export class GameViewDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto

    // TODO: add missing @ApiProperty
    ownedGameData: null | {
        purchaseDate: string | null
        purchasePrice: number | null
        purchaseNotes: string | null
    }

    tags: Array<{
        tag: string
        category: string
    }>

    wishlistedGameData: null | {
        dateAdded: string
        notes: string
    }

    ratingData: {
        userRating: null | number
        avgGroupsRating: null | { review: number; count: number }
        avgGlobalRating: null | { review: number; count: number }
    }

    @ApiProperty({ type: [GameDto] })
    similarGames: Array<GameDto>

    playHistory: Array<{
        group: GroupDto
        meet: MeetDto
        playedBy: Array<UserGetDto>
    }>
}
