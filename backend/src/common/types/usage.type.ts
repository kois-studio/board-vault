import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

/**
 * A screen, as an Angular route template: `/groups/:groupId`, never `/groups/12`. Segments are
 * lowercase words or `:params`, so an id or a name can't get in (ADR-0021).
 */
export const VIEW_PATTERN = /^\/$|^(\/([a-z][a-z0-9-]*|:[a-zA-Z]+))+$/
export const VIEW_MAX_LENGTH = 80

export function isView(value: unknown): value is string {
    return typeof value === 'string' && value.length <= VIEW_MAX_LENGTH && VIEW_PATTERN.test(value)
}

/** Every event Board Vault records (ADR-0021). Anything else is dropped. */
export const USAGE_EVENTS = [
    'page_viewed',
    'account_created',
    'game_added',
    'game_wishlisted',
    'review_saved',
    'game_proposed',
    'group_created',
    'group_joined',
    'invite_sent',
    'session_planned',
    'session_recorded',
    'session_started',
    'session_finished',
    'session_cancelled',
    'game_suggested',
    'game_voted',
    'night_answered',
    'played_games_recorded',
    'results_recorded',
    'group_person_game_set',
] as const

export type UsageEventName = (typeof USAGE_EVENTS)[number]

export class NavigationBody {
    @ApiProperty({ example: '/groups/:groupId', description: 'The page now shown, as a route template.' })
    @IsString()
    @MaxLength(VIEW_MAX_LENGTH)
    @Matches(VIEW_PATTERN)
    page: string

    @ApiPropertyOptional({ example: '/play', description: 'The page before it in this visit, as a route template.' })
    @IsOptional()
    @IsString()
    @MaxLength(VIEW_MAX_LENGTH)
    @Matches(VIEW_PATTERN)
    from?: string
}

export class PrivacySettingsDto {
    @ApiProperty({ example: true, description: 'Whether what this account does counts towards usage statistics (ADR-0021).' })
    @IsBoolean()
    usageAnalytics: boolean
}

export class PrivacySettingsStateDto extends PrivacySettingsDto {
    @ApiProperty({
        example: false,
        description: 'Whether the account has answered the notice about usage statistics; until then the app shows it once (#158).',
    })
    noticeAnswered: boolean
}

export class UsageDayDto {
    @ApiProperty({ example: '2026-10-16' })
    day: string

    @ApiProperty({ example: 4 })
    people: number

    @ApiProperty({ example: 37 })
    events: number
}

export class UsagePageDto {
    @ApiProperty({ example: '/groups/:groupId' })
    page: string

    @ApiProperty({ example: 52 })
    views: number

    @ApiProperty({ example: 6 })
    people: number
}

export class UsagePathDto {
    @ApiProperty({ example: '/play' })
    from: string

    @ApiProperty({ example: '/play/history' })
    page: string

    @ApiProperty({ example: 9 })
    count: number
}

export class UsageViewCountDto {
    @ApiProperty({ example: '/games/:gameId', nullable: true, type: String })
    view: string | null

    @ApiProperty({ example: 5 })
    count: number
}

export class UsageActionDto {
    @ApiProperty({ example: 'review_saved' })
    name: string

    @ApiProperty({ example: 14 })
    events: number

    @ApiProperty({ example: 5 })
    people: number

    @ApiProperty({ type: [UsageViewCountDto], description: 'The screens it came from, most first.' })
    views: Array<UsageViewCountDto>
}

export class UsageFunnelStepDto {
    @ApiProperty({ example: 'Planned a night' })
    label: string

    @ApiProperty({ example: 6, description: 'People who reached this step after all the earlier ones, in order.' })
    people: number
}

export class UsageFunnelDto {
    @ApiProperty({ example: 'Game night' })
    name: string

    @ApiProperty({ type: [UsageFunnelStepDto] })
    steps: Array<UsageFunnelStepDto>
}

export class UsageMonthDto {
    @ApiProperty({ example: '2026-09' })
    month: string

    @ApiProperty({ example: 812 })
    events: number

    @ApiProperty({ example: 120, description: 'Page views, from the daily counts.' })
    pageViews: number
}

export class UsageReportDto {
    @ApiProperty({ example: true, description: 'False when the API has no pseudonym secret, so nothing is recorded.' })
    recording: boolean

    @ApiProperty({ example: 6, description: 'People who did anything in the last 30 days.' })
    people: number

    @ApiProperty({ example: 420 })
    events: number

    @ApiProperty({ example: 2, description: 'Accounts that turned usage statistics off.' })
    optedOut: number

    @ApiProperty({ type: [UsageDayDto] })
    days: Array<UsageDayDto>

    @ApiProperty({ type: [UsagePageDto] })
    pages: Array<UsagePageDto>

    @ApiProperty({ type: [UsagePathDto] })
    paths: Array<UsagePathDto>

    @ApiProperty({ type: [UsageActionDto] })
    actions: Array<UsageActionDto>

    @ApiProperty({ type: [UsageFunnelDto] })
    funnels: Array<UsageFunnelDto>

    @ApiProperty({ type: [UsageMonthDto], description: 'Earlier months, from the anonymous daily counts.' })
    months: Array<UsageMonthDto>
}
