import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { mergeMap } from 'rxjs'

import { isView, type UsageEventName } from '../../../common/types/usage.type.js'

import { UsageService } from './usage.service.js'

import type { Observable } from 'rxjs'

type UsageRequest = {
    method: string
    route?: { path?: string }
    headers: Record<string, string | Array<string> | undefined>
    body?: Record<string, unknown>
    user?: { userId?: number }
}

const SESSION_STATUS_EVENTS: Record<string, UsageEventName> = {
    active: 'session_started',
    completed: 'session_finished',
    cancelled: 'session_cancelled',
}

/** What a successful request counts as, by method and route template. Unlisted routes record nothing. */
const ACTIONS: Record<string, UsageEventName | ((request: UsageRequest, response: unknown) => UsageEventName | null)> = {
    'POST /collection/users/:userId/games/:gameId': 'game_added',
    'PUT /collection/users/:userId/games/:gameId/wishlist': (_request, response) =>
        (response as { isWishlisted?: boolean } | null)?.isWishlisted === true ? 'game_wishlisted' : null,
    'POST /collection/users/:userId/reviews/:gameId': 'review_saved',
    'POST /profile/users/:userId/proposals': 'game_proposed',
    'POST /dashboard/users/:userId/groups/create/:groupName': 'group_created',
    'POST /profile/users/:userId/invitations/:invitationId/accept': 'group_joined',
    'POST /groups/:groupId/clerk-invitations': 'invite_sent',
    'POST /invitations/byUsername': 'invite_sent',
    'POST /sessions/scheduled': 'session_planned',
    'POST /sessions': 'session_recorded',
    'PATCH /sessions/:sessionId/status': request => SESSION_STATUS_EVENTS[String(request.body?.['status'])] ?? null,
    'POST /sessions/:sessionId/shortlist/:gameId': 'game_suggested',
    'PUT /sessions/:sessionId/votes/:gameId': 'game_voted',
    'PATCH /sessions/:sessionId/rsvp': 'night_answered',
    'PATCH /sessions/:sessionId/played-games': 'played_games_recorded',
    'PUT /sessions/:sessionId/games/:gameId/results': 'results_recorded',
    'PUT /groups/:groupId/people/:personId/ownership': 'group_person_game_set',
}

/** `/collection/users/:userId/games/:gameId` from whatever Express kept, without doubled or trailing slashes. */
export function routeTemplate(path: string | undefined): string {
    return `/${(path ?? '').split('/').filter(Boolean).join('/')}`
}

/**
 * Counts successful actions for usage analytics (ADR-0021), once the handler has succeeded. The screen
 * they came from is the `X-Board-Vault-View` header, kept only when it is a route template.
 */
@Injectable()
export class UsageInterceptor implements NestInterceptor {
    constructor(private readonly usageService: UsageService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') return next.handle()
        const request = context.switchToHttp().getRequest<UsageRequest>()
        const action = ACTIONS[`${request.method} ${routeTemplate(request.route?.path)}`]

        if (!action) return next.handle()

        // Waited for, not fired and forgotten: on Vercel, work left after the response can be frozen and lost.
        // `record` never throws, so a failure to count never fails the request.
        return next.handle().pipe(
            mergeMap(async response => {
                const accountId = request.user?.userId
                const name = typeof action === 'function' ? action(request, response) : action
                const header = request.headers['x-board-vault-view']
                const view = typeof header === 'string' && isView(header) ? header : null

                if (accountId && name) await this.usageService.record(accountId, name, view)
                return response
            }),
        )
    }
}
