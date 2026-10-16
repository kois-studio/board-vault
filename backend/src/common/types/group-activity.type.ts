import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

import { GROUP_PERSON_STANDINGS, type GroupPersonStanding } from './group-person.type.js'

/** What a group history entry says happened (ADR-0020). */
export const GROUP_ACTIVITY_TYPES = [
    'session_planned',
    'session_recorded',
    'session_started',
    'session_finished',
    'session_cancelled',
    'session_invites_changed',
    'session_shortlist_changed',
    'session_bringer_changed',
    'session_played_changed',
    'session_rsvp',
    'session_attendance_changed',
    'session_results_changed',
    'person_added',
    'person_updated',
    'person_archived',
    'person_restored',
    'person_claimed',
    'person_game_set',
    'person_preference_set',
    'person_preference_removed',
    'member_joined',
    'member_left',
    'member_removed',
] as const

export type GroupActivityType = (typeof GROUP_ACTIVITY_TYPES)[number]

/** Identifiers and fixed values only: never a name, a note or other free text (ADR-0020). */
export type GroupActivityData = Record<string, number | string | boolean | null | Array<number>>

/** One entry as it is written, with the change it describes. */
export type GroupActivityEntry = {
    groupId: number
    actorAccountId: number
    type: GroupActivityType
    meetId?: number
    groupPersonId?: number
    gameId?: number
    subjectAccountId?: number
    data?: GroupActivityData
}

export class GroupActivityQuery {
    @ApiPropertyOptional({ description: 'Return entries older than this id (the last id of the previous page).', example: 120 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    before?: number

    @ApiPropertyOptional({ description: 'Entries per page, 1 to 50.', example: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number
}

export class GroupActivityPersonDto {
    @ApiProperty({ example: 7 })
    id: number

    @ApiProperty({ example: 'Pedro' })
    name: string

    @ApiProperty({ enum: GROUP_PERSON_STANDINGS })
    standing: GroupPersonStanding
}

export class GroupActivityAccountDto {
    @ApiProperty({ example: 12 })
    id: number

    @ApiProperty({ example: 'Ana', description: 'The current name: "Deleted account" once the account is deleted (ADR-0018).' })
    name: string

    @ApiProperty({ enum: GROUP_PERSON_STANDINGS })
    standing: GroupPersonStanding
}

export class GroupActivityGameDto {
    @ApiProperty({ example: 42 })
    id: number

    @ApiProperty({ example: 'Catan', nullable: true, type: String, description: 'Null when the game is no longer in the catalogue.' })
    title: string | null
}

export class GroupActivityDto {
    @ApiProperty({ example: 120 })
    id: number

    @ApiProperty({ enum: GROUP_ACTIVITY_TYPES })
    type: GroupActivityType

    @ApiProperty({ example: '2026-10-16 18:30:00' })
    createdAt: string

    @ApiProperty({ type: GroupActivityAccountDto })
    actor: GroupActivityAccountDto

    @ApiPropertyOptional({ example: 31, nullable: true, type: Number })
    meetId: number | null

    @ApiPropertyOptional({ type: GroupActivityPersonDto, nullable: true })
    person: GroupActivityPersonDto | null

    @ApiPropertyOptional({ type: GroupActivityGameDto, nullable: true })
    game: GroupActivityGameDto | null

    @ApiPropertyOptional({ type: GroupActivityAccountDto, nullable: true })
    subject: GroupActivityAccountDto | null

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        example: { addedGameIds: [42], removedGameIds: [] },
        description: 'The rest of the change, as identifiers and fixed values.',
    })
    data: GroupActivityData

    @ApiProperty({ type: [GroupActivityAccountDto], description: 'Accounts named by id in `data`, so the page can show their names.' })
    accounts: Array<GroupActivityAccountDto>

    @ApiProperty({ type: [GroupActivityPersonDto], description: 'Group people named by id in `data`.' })
    people: Array<GroupActivityPersonDto>

    @ApiProperty({ type: [GroupActivityGameDto], description: 'Games named by id in `data`.' })
    games: Array<GroupActivityGameDto>
}

export class GroupActivityPageDto {
    @ApiProperty({ type: [GroupActivityDto] })
    entries: Array<GroupActivityDto>

    @ApiProperty({ example: true, description: 'Whether older entries exist; ask again with `before` set to the last id.' })
    hasMore: boolean
}
