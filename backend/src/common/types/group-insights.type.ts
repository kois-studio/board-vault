import { ApiProperty } from '@nestjs/swagger'

import { GameCompleteDto } from './game.type.js'
import { AvatarDto } from './user.type.js'

/**
 * One person in the group's standings. A group person linked to an account is
 * counted as that account, so someone recorded both ways appears once.
 */
export class GroupStandingDto {
    @ApiProperty({ example: 4, nullable: true, description: 'Set for anyone with an account.' })
    accountId: number | null

    @ApiProperty({ example: 12, nullable: true, description: 'The group person, when the group has one for them.' })
    groupPersonId: number | null

    @ApiProperty({ example: 'Lucía' })
    displayName: string

    @ApiProperty({ type: AvatarDto, nullable: true })
    avatar: AvatarDto | null

    @ApiProperty({ example: 6, description: 'Completed game nights where they played at least one game.' })
    sessions: number

    @ApiProperty({ example: 14, description: 'Games they played across completed game nights.' })
    gamesPlayed: number

    @ApiProperty({ example: 5, description: 'Games they won, shared wins included.' })
    wins: number
}

export class GroupGamePlayCountDto {
    @ApiProperty({ type: GameCompleteDto })
    gameData: GameCompleteDto

    @ApiProperty({ example: 3, description: 'Completed game nights where it was played.' })
    sessions: number

    @ApiProperty({ example: '2026-09-04T19:00:00.000Z' })
    lastPlayedAt: string
}

export class GroupInsightsDto {
    @ApiProperty({ example: 8, description: 'Completed game nights.' })
    sessions: number

    @ApiProperty({ example: 19, description: 'Games played across completed game nights.' })
    gamesPlayed: number

    @ApiProperty({ example: 7, description: 'Played games with at least one winner recorded.' })
    gamesWithWinner: number

    @ApiProperty({ type: [GroupStandingDto], description: 'Most wins first, then most games played.' })
    standings: Array<GroupStandingDto>

    @ApiProperty({ type: [GroupGamePlayCountDto], description: 'The five games played on most game nights.' })
    mostPlayed: Array<GroupGamePlayCountDto>

    @ApiProperty({ type: [GameCompleteDto], description: 'Up to twelve games the group owns but has never played, by title.' })
    neverPlayed: Array<GameCompleteDto>

    @ApiProperty({ example: 23, description: 'How many owned games the group has never played.' })
    neverPlayedCount: number
}

/** One person's games in a group, and what they are worth at retail price. */
export class GroupCollectionPersonDto {
    @ApiProperty({ example: 4, nullable: true, description: 'Set for a member with an account.' })
    accountId: number | null

    @ApiProperty({ example: 12, nullable: true, description: 'Set for a person in the group without an account.' })
    groupPersonId: number | null

    @ApiProperty({ example: 'Lucía' })
    displayName: string

    @ApiProperty({ type: AvatarDto, nullable: true })
    avatar: AvatarDto | null

    @ApiProperty({ type: [GameCompleteDto], description: 'The games they bring, by title.' })
    games: Array<GameCompleteDto>

    @ApiProperty({ example: 410, description: 'Approximate worth in whole euros: the sum of the retail prices known.' })
    worth: number

    @ApiProperty({ example: 8, description: 'How many of their games have a known retail price.' })
    pricedGames: number
}

/**
 * The group's games and their approximate worth (ADR-0016). Worth comes from catalogue retail
 * prices, never from what anyone recorded paying.
 */
export class GroupCollectionDto {
    @ApiProperty({ example: 1240, description: 'Approximate worth of every copy in the group, in whole euros.' })
    worth: number

    @ApiProperty({ example: 31, description: 'Copies owned in the group; two people with the same game count twice.' })
    copies: number

    @ApiProperty({ example: 28, description: 'Copies with a known retail price.' })
    pricedCopies: number

    @ApiProperty({ type: [GroupCollectionPersonDto], description: 'Members first, then people without an account, by name.' })
    people: Array<GroupCollectionPersonDto>
}
