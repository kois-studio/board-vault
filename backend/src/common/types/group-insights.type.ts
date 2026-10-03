import { ApiProperty } from '@nestjs/swagger'

import { GameCompleteDto } from './game.type'
import { AvatarDto } from './user.type'

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
