import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator'

import { VIEW_MAX_LENGTH, VIEW_PATTERN } from './usage.type.js'

/** What went wrong in the app (ADR-0028). The API records its own unexpected exceptions as `exception`. */
export const APP_PROBLEM_KINDS = ['error', 'rejection', 'chunk', 'request'] as const
export type AppProblemKind = (typeof APP_PROBLEM_KINDS)[number]
export type ProblemKind = AppProblemKind | 'exception'
export type ProblemSource = 'app' | 'api'

/**
 * A problem the app ran into, as it sends it. Longer text is accepted and cut by the API, which also scrubs it. A new
 * field reaches the API before the app sends it, as every field does (unknown fields are refused).
 */
export class ProblemReportBody {
    @ApiProperty({
        enum: APP_PROBLEM_KINDS,
        description:
            'error: thrown in the app; rejection: a promise nobody handled; chunk: a page whose code could not load; request: an API call that got no answer or a 5xx.',
    })
    @IsIn(APP_PROBLEM_KINDS)
    kind: AppProblemKind

    @ApiProperty({ example: 'TypeError' })
    @IsString()
    @MaxLength(200)
    name: string

    @ApiProperty({ example: "Cannot read properties of undefined (reading 'id')" })
    @IsString()
    @MaxLength(2000)
    message: string

    @ApiPropertyOptional({ description: 'The stack, if any; cut to 4000 characters and scrubbed.' })
    @IsOptional()
    @IsString()
    @MaxLength(8000)
    stack?: string

    @ApiPropertyOptional({ example: '/groups/:groupId', description: 'The screen it happened on, as a route template.' })
    @IsOptional()
    @IsString()
    @MaxLength(VIEW_MAX_LENGTH)
    @Matches(VIEW_PATTERN)
    view?: string

    @ApiPropertyOptional({ example: 'GET', description: 'For a request: its method.' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    method?: string

    @ApiPropertyOptional({
        example: '/dashboard/users/:id/group-overviews',
        description: 'For a request: its path; ids are replaced by the API.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    path?: string

    @ApiPropertyOptional({ example: 503, description: 'For a request: the status, 0 when there was no answer.' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(599)
    status?: number

    @ApiPropertyOptional({ description: "For a request: the API's requestId from the error answer, to find its log lines." })
    @IsOptional()
    @IsUUID()
    requestId?: string

    @ApiPropertyOptional({ example: 'a1b2c3d', description: 'The build of the app.' })
    @IsOptional()
    @IsString()
    @Matches(/^[A-Za-z0-9._-]{1,40}$/)
    release?: string

    @ApiPropertyOptional({ example: 'es', description: 'The language of the app.' })
    @IsOptional()
    @IsString()
    @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    locale?: string
}

/** One problem in the last 30 days, all its days added up, with its latest sample (admins only). */
export class ProblemSummaryDto {
    @ApiProperty() fingerprint: string
    @ApiProperty({ enum: ['app', 'api'] }) source: ProblemSource
    @ApiProperty({ enum: [...APP_PROBLEM_KINDS, 'exception'] }) kind: ProblemKind
    @ApiProperty() name: string
    @ApiProperty() message: string
    @ApiProperty({ nullable: true, type: String }) stack: string | null
    @ApiProperty({ nullable: true, type: String }) view: string | null
    @ApiProperty({ nullable: true, type: String, example: 'GET /dashboard/users/:id/group-overviews' }) endpoint: string | null
    @ApiProperty({ nullable: true, type: Number }) status: number | null
    @ApiProperty({ nullable: true, type: String, description: 'The latest one.' }) requestId: string | null
    @ApiProperty({ nullable: true, type: String, description: 'The latest one.' }) release: string | null
    @ApiProperty({ nullable: true, type: String, description: 'The latest one.' }) locale: string | null
    @ApiProperty({ nullable: true, type: String, example: 'Firefox 133 · Windows', description: 'The latest one.' }) browser: string | null
    @ApiProperty({ description: 'How many times, over the last 30 days.' }) occurrences: number
    @ApiProperty({ description: 'On how many days it happened.' }) days: number
    @ApiProperty() firstSeenAt: string
    @ApiProperty() lastSeenAt: string
}

export class ProblemReportDto {
    @ApiProperty({ type: [ProblemSummaryDto], description: 'Most recent first.' })
    problems: Array<ProblemSummaryDto>

    @ApiProperty({ description: 'Distinct problems a day can add; past it, only problems already seen that day are counted.' })
    dailyLimit: number

    @ApiProperty({ description: 'Whether a day of the last 30 reached the limit, so some problems may be missing.' })
    limitReached: boolean
}
