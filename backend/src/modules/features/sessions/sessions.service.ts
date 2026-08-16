import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import type {
    CreatePlaySessionBody,
    CreateScheduledSessionBody,
    ScheduledSessionCreatedDto,
    SessionStatusUpdatedDto,
    SessionCreatedDto,
    UpdateSessionStatusBody,
} from '../../../common/types/session.type'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class SessionsService {
    constructor(private readonly databaseService: DatabaseService) {}

    async createCompletedSession(actorAccountId: number, body: CreatePlaySessionBody): Promise<SessionCreatedDto> {
        const group = await this.databaseService.getGroupById(body.groupId)
        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(body.groupId)
        const memberIdSet = new Set(memberIds)

        if (!memberIdSet.has(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to create a session')
        }

        if (body.attendeeIds.some(accountId => !memberIdSet.has(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const games = body.games.map(game => ({
            gameId: game.gameId,
            participantIds: [...new Set(game.participantIds)],
        }))
        const gameIds = games.map(game => game.gameId)

        if (new Set(gameIds).size !== gameIds.length) {
            throw new BadRequestException('Each game may only appear once in a session')
        }

        const availableGameIds = new Set(await this.databaseService.getGroupAvailableGameIds(body.groupId))
        if (gameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every game must be owned by at least one group member')
        }

        const attendeeIdSet = new Set(body.attendeeIds)
        for (const game of games) {
            if (game.participantIds.some(accountId => !attendeeIdSet.has(accountId))) {
                throw new BadRequestException('Game participants must be selected attendees')
            }
        }

        const result = await this.databaseService.createCompletedSession({
            groupId: body.groupId,
            createdBy: actorAccountId,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            attendeeIds: body.attendeeIds,
            games,
        })

        return {
            sessionId: Number(result.lastInsertRowid),
            status: 'completed',
        }
    }

    async createScheduledSession(actorAccountId: number, body: CreateScheduledSessionBody): Promise<ScheduledSessionCreatedDto> {
        const group = await this.databaseService.getGroupById(body.groupId)
        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(body.groupId)
        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to schedule a session')
        }

        const attendeeIds = [...new Set(body.attendeeIds ?? memberIds)]
        if (attendeeIds.length === 0) {
            throw new BadRequestException('A scheduled session must have at least one attendee')
        }

        if (attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const plannedGameIds = [...new Set(body.plannedGameIds ?? [])]
        const availableGameIds = new Set(await this.databaseService.getGroupAvailableGameIds(body.groupId))
        if (plannedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every planned game must be owned by at least one group member')
        }

        const result = await this.databaseService.createScheduledSession({
            groupId: body.groupId,
            createdBy: actorAccountId,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            attendeeIds,
            plannedGameIds,
        })

        return {
            sessionId: Number(result.lastInsertRowid),
            status: 'scheduled',
        }
    }

    async updateSessionStatus(actorAccountId: number, sessionId: number, body: UpdateSessionStatusBody): Promise<SessionStatusUpdatedDto> {
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)
        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can change its status')
        }

        const currentStatus = String(session.rows[0][5] ?? 'completed') as SessionStatusUpdatedDto['status']
        const allowedTransitions: Record<SessionStatusUpdatedDto['status'], Array<UpdateSessionStatusBody['status']>> = {
            scheduled: ['active', 'completed', 'cancelled'],
            active: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        }

        if (!allowedTransitions[currentStatus].includes(body.status)) {
            throw new BadRequestException(`Cannot change a ${currentStatus} session to ${body.status}`)
        }

        const result = await this.databaseService.updateMeetStatus(sessionId, body.status)
        if (result.rowsAffected !== 1) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        return { sessionId, status: body.status }
    }
}
