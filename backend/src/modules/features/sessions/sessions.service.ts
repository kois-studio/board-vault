import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import type { CreatePlaySessionBody, SessionCreatedDto } from '../../../common/types/session.type'
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
}
