import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { mapMeetDetailsResult } from '../../../common/mappers/meet-details.mapper.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { MeetWithAttendeesAndGames } from '../../../common/types/meet.type.js'
import type {
    CreatePlaySessionBody,
    CreateScheduledSessionBody,
    ScheduledSessionCreatedDto,
    SessionAttendeesUpdatedDto,
    SessionShortlistUpdatedDto,
    SessionPlayedGamesUpdatedDto,
    SessionStatusUpdatedDto,
    SessionCreatedDto,
    SessionRsvpUpdatedDto,
    SessionAttendanceUpdatedDto,
    UpdateSessionAttendeesBody,
    UpdateSessionShortlistBody,
    UpdateSessionPlayedGamesBody,
    UpdateSessionAttendanceBody,
    UpdateSessionRsvpBody,
    UpdateSessionStatusBody,
    UpdateGameResultsBody,
    GameResultsUpdatedDto,
} from '../../../common/types/session.type.js'

@Injectable()
export class SessionsService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getSessionDetails(actorAccountId: number, sessionId: number): Promise<MeetWithAttendeesAndGames> {
        const result = await this.databaseService.sessions.getMeetDetailsByIdForAccount(sessionId, actorAccountId)
        const session = mapMeetDetailsResult(result)

        if (!session) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        return session
    }

    async createCompletedSession(actorAccountId: number, body: CreatePlaySessionBody): Promise<SessionCreatedDto> {
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)
        const memberIdSet = new Set(memberIds)

        if (!memberIdSet.has(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to create a session')
        }

        const attendeeIds = [...new Set(body.attendeeIds ?? [])]
        const groupPersonIds = [...new Set(body.groupPersonIds ?? [])]
        const usesGroupPeople = groupPersonIds.length > 0
        const usesAccounts = attendeeIds.length > 0

        if (attendeeIds.length === 0 && groupPersonIds.length === 0) {
            throw new BadRequestException('A completed session must have at least one attendee')
        }

        if (attendeeIds.some(accountId => !memberIdSet.has(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        if (usesGroupPeople) {
            const people = await this.getGroupPeople(body.groupId)
            const activePeople = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

            if (groupPersonIds.some(groupPersonId => !activePeople.has(groupPersonId))) {
                throw new BadRequestException('Every participant must be active in the selected group')
            }
        }

        const games = body.games.map(game => ({
            gameId: game.gameId,
            participantIds: [...new Set(game.participantIds ?? [])],
        }))
        const personGames = body.games.map(game => ({
            gameId: game.gameId,
            participantIds: [...new Set(game.participantPersonIds ?? [])],
        }))
        const gameIds = games.map(game => game.gameId)

        if (new Set(gameIds).size !== gameIds.length) {
            throw new BadRequestException('Each game may only appear once in a session')
        }

        if (usesGroupPeople && !usesAccounts && personGames.some(game => game.participantIds.length === 0)) {
            throw new BadRequestException('Every played game must have at least one participant')
        }

        if (
            usesAccounts &&
            games.some((game, index) => game.participantIds.length === 0 && (personGames[index]?.participantIds.length ?? 0) === 0)
        ) {
            throw new BadRequestException('Every played game must have at least one participant')
        }

        const availableGameIds = new Set<number>()

        if (usesAccounts) {
            for (const gameId of await this.databaseService.groups.getGroupAvailableGameIds(body.groupId)) availableGameIds.add(gameId)
        }
        if (usesGroupPeople) {
            for (const gameId of await this.getGroupAvailableGameIdsForPeople(body.groupId, groupPersonIds)) {
                availableGameIds.add(gameId)
            }
        }

        if (gameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every game must be owned by at least one group member')
        }

        const selectedAccountIds = new Set(attendeeIds)
        const selectedPersonIds = new Set(groupPersonIds)

        for (const [index, game] of games.entries()) {
            if (game.participantIds.some(participantId => !selectedAccountIds.has(participantId))) {
                throw new BadRequestException('Game participants must be selected attendees')
            }
            if (personGames[index]?.participantIds.some(participantId => !selectedPersonIds.has(participantId))) {
                throw new BadRequestException('Game participants must be selected group people')
            }
        }

        const result = await this.databaseService.sessions.createCompletedSession({
            groupId: body.groupId,
            createdBy: actorAccountId,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            notes: body.notes,
            attendeeIds,
            groupPersonIds: usesGroupPeople ? groupPersonIds : undefined,
            games,
            personGames: usesGroupPeople ? personGames : undefined,
        })

        return {
            sessionId: Number(result.lastInsertRowid),
            status: 'completed',
        }
    }

    async createScheduledSession(actorAccountId: number, body: CreateScheduledSessionBody): Promise<ScheduledSessionCreatedDto> {
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to schedule a session')
        }

        const attendeeIds = [...new Set(body.attendeeIds ?? [])]
        const groupPersonIds = [...new Set(body.groupPersonIds ?? [])]
        const usesGroupPeople = groupPersonIds.length > 0
        const selectedAccountIds = attendeeIds.length > 0 ? attendeeIds : usesGroupPeople ? [] : memberIds

        if (selectedAccountIds.length === 0 && groupPersonIds.length === 0) {
            throw new BadRequestException('A scheduled session must have at least one attendee')
        }

        if (selectedAccountIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        if (usesGroupPeople) {
            const people = await this.getGroupPeople(body.groupId)
            const activePeople = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

            if (groupPersonIds.some(groupPersonId => !activePeople.has(groupPersonId))) {
                throw new BadRequestException('Every participant must be active in the selected group')
            }
        }

        const plannedGameIds = [...new Set(body.plannedGameIds ?? [])]
        const availableGameIds = new Set<number>()

        if (selectedAccountIds.length > 0) {
            for (const gameId of await this.databaseService.groups.getGroupAvailableGameIds(body.groupId)) availableGameIds.add(gameId)
        }
        if (groupPersonIds.length > 0) {
            for (const gameId of await this.getGroupAvailableGameIdsForPeople(body.groupId, groupPersonIds)) {
                availableGameIds.add(gameId)
            }
        }

        if (plannedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every planned game must be owned by at least one group member')
        }

        const result = await this.databaseService.sessions.createScheduledSession({
            groupId: body.groupId,
            createdBy: actorAccountId,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            notes: body.notes,
            attendeeIds: selectedAccountIds,
            groupPersonIds: usesGroupPeople ? groupPersonIds : undefined,
            plannedGameIds,
        })

        return {
            sessionId: Number(result.lastInsertRowid),
            status: 'scheduled',
        }
    }

    async updateSessionStatus(actorAccountId: number, sessionId: number, body: UpdateSessionStatusBody): Promise<SessionStatusUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForCreator(sessionId, actorAccountId)

        const [sessionRow] = session.rows

        if (!sessionRow) {
            throw new ForbiddenException('Only the session organizer can change its status')
        }

        const currentStatus = String(sessionRow[5] ?? 'completed') as SessionStatusUpdatedDto['status']
        const allowedTransitions: Record<SessionStatusUpdatedDto['status'], Array<UpdateSessionStatusBody['status']>> = {
            scheduled: ['active', 'cancelled'],
            active: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        }

        if (!allowedTransitions[currentStatus].includes(body.status)) {
            throw new BadRequestException(`Cannot change a ${currentStatus} session to ${body.status}`)
        }

        if (body.status === 'completed' && !body.noGamesPlayed) {
            const played = await this.databaseService.sessions.countPlayedMeetGames(sessionId)

            if (Number(played.rows[0]?.['played'] ?? 0) === 0) {
                throw new BadRequestException('No game is marked as played. Mark what you played, or confirm that nothing was played.')
            }
        }

        // A night started or finished before its date was played now, so History keeps it in order (#94).
        const sessionDate = String(sessionRow[3])
        const now = new Date()
        const movedDate = body.status !== 'cancelled' && Date.parse(sessionDate) > now.getTime() ? now.toISOString() : undefined

        const result = await this.databaseService.sessions.updateMeetStatus(sessionId, currentStatus, body.status, movedDate)

        if (result.rowsAffected !== 1) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        return { sessionId, status: body.status, sessionDate: movedDate ?? sessionDate }
    }

    async updateSessionAttendees(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionAttendeesBody,
    ): Promise<SessionAttendeesUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForCreator(sessionId, actorAccountId)

        const [sessionRow] = session.rows

        if (!sessionRow) {
            throw new ForbiddenException('Only the session organizer can manage attendees')
        }

        const attendeeIds = [...new Set(body.attendeeIds ?? [])]
        const groupPersonIds = [...new Set(body.groupPersonIds ?? [])]

        if (attendeeIds.length === 0 && groupPersonIds.length === 0) {
            throw new BadRequestException('A session must retain at least one attendee')
        }

        const status = String(sessionRow[5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit attendees on a ${status} session`)
        }

        const groupId = Number(sessionRow[1])
        const memberIds = await this.databaseService.groups.getGroupMemberIds(groupId)

        if (attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the session group')
        }

        const people = groupPersonIds.length > 0 ? await this.getGroupPeople(groupId) : { rows: [] }
        const activePeople = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

        if (groupPersonIds.some(groupPersonId => !activePeople.has(groupPersonId))) {
            throw new BadRequestException('Every participant must be active in the session group')
        }

        const nextAttendeeIds = new Set(attendeeIds)
        const nextPersonIds = new Set(groupPersonIds)
        const existingAccountIds = await this.databaseService.sessions.getMeetAttendeeIds(sessionId)
        const existingPersonIds = await this.getMeetPersonIds(sessionId)
        const playedAccountParticipants = await this.databaseService.sessions.getMeetPlayedGameParticipants(sessionId)
        const playedPersonParticipants = await this.getMeetPlayedGameParticipants(sessionId)

        if (playedAccountParticipants.some(game => game.participantIds.some(participantId => !nextAttendeeIds.has(participantId)))) {
            throw new BadRequestException('A member who played a recorded game cannot be removed from the session attendees')
        }
        if (playedPersonParticipants.some(game => game.participantIds.some(participantId => !nextPersonIds.has(participantId)))) {
            throw new BadRequestException('A member who played a recorded game cannot be removed from the session attendees')
        }

        const accountApplied =
            existingAccountIds.length > 0 || (existingPersonIds.length === 0 && attendeeIds.length > 0)
                ? await this.databaseService.sessions.replaceMeetAttendees(sessionId, attendeeIds, status)
                : true
        const personApplied =
            existingPersonIds.length > 0 || groupPersonIds.length > 0
                ? await this.databaseService.sessions.replaceMeetPersonAttendees(sessionId, groupPersonIds, status)
                : true

        if (accountApplied === false || personApplied === false) {
            throw new ConflictException('The session changed while attendees were being updated. Reload and try again.')
        }
        return { sessionId, attendeeIds, groupPersonIds: groupPersonIds.length > 0 ? groupPersonIds : undefined }
    }

    async updateSessionShortlist(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionShortlistBody,
    ): Promise<SessionShortlistUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForCreator(sessionId, actorAccountId)

        const [sessionRow] = session.rows

        if (!sessionRow) {
            throw new ForbiddenException('Only the session organizer can manage the shortlist')
        }

        const status = String(sessionRow[5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit the shortlist on a ${status} session`)
        }

        const groupId = Number(sessionRow[1])
        const personIds = await this.getMeetPersonIds(sessionId)
        const availableGameIds = new Set(await this.databaseService.groups.getGroupAvailableGameIds(groupId))

        for (const gameId of await this.getGroupAvailableGameIdsForPeople(groupId, personIds)) {
            availableGameIds.add(gameId)
        }
        const plannedGameIds = [...new Set(body.plannedGameIds)]

        if (plannedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every planned game must be owned by at least one group member')
        }

        const applied = await this.databaseService.sessions.replaceMeetPlannedGames(sessionId, plannedGameIds, status)

        if (applied === false) {
            throw new ConflictException('The session changed while the shortlist was being updated. Reload and try again.')
        }
        return { sessionId, plannedGameIds }
    }

    async updateSessionPlayedGames(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionPlayedGamesBody,
    ): Promise<SessionPlayedGamesUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForCreator(sessionId, actorAccountId)

        const [sessionRow] = session.rows

        if (!sessionRow) {
            throw new ForbiddenException('Only the session organizer can record games played')
        }

        const status = String(sessionRow[5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit played games on a ${status} session`)
        }

        const groupId = Number(sessionRow[1])
        const personIds = await this.getMeetPersonIds(sessionId)
        const accountIds = await this.databaseService.sessions.getMeetAttendeeIds(sessionId)
        const availableGameIds = new Set<number>()

        if (accountIds.length > 0) {
            for (const gameId of await this.databaseService.groups.getGroupAvailableGameIds(groupId)) availableGameIds.add(gameId)
        }
        for (const gameId of await this.getGroupAvailableGameIdsForPeople(groupId, personIds)) availableGameIds.add(gameId)
        const playedGameIds = [...new Set(body.playedGameIds)]

        if (playedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every played game must be owned by at least one group member')
        }

        const attendees = new Set(await this.databaseService.sessions.getMeetAttendeeIds(sessionId))
        const personAttendees = new Set(personIds)
        const existingAccountParticipants = body.games ? [] : await this.databaseService.sessions.getMeetPlayedGameParticipants(sessionId)
        const existingPersonParticipants = body.games ? [] : await this.getMeetPlayedGameParticipants(sessionId)
        const games = body.games
            ? body.games.map(game => ({ gameId: game.gameId, participantIds: [...new Set(game.participantIds ?? [])] }))
            : playedGameIds.map(gameId => ({
                  gameId,
                  participantIds: existingAccountParticipants.find(existing => existing.gameId === gameId)?.participantIds ?? [],
              }))
        const personGames = body.games
            ? body.games.map(game => ({ gameId: game.gameId, participantIds: [...new Set(game.participantPersonIds ?? [])] }))
            : playedGameIds.map(gameId => ({
                  gameId,
                  participantIds: existingPersonParticipants.find(existing => existing.gameId === gameId)?.participantIds ?? [],
              }))

        if (body.games) {
            const detailedGameIds = games.map(game => game.gameId)

            if (games.some((game, index) => game.participantIds.length === 0 && (personGames[index]?.participantIds.length ?? 0) === 0)) {
                throw new BadRequestException('Every played game must have at least one participant')
            }

            if (
                new Set(detailedGameIds).size !== detailedGameIds.length ||
                detailedGameIds.some(gameId => !playedGameIds.includes(gameId))
            ) {
                throw new BadRequestException('Per-game participants must be provided only for games marked as played')
            }

            if (detailedGameIds.length !== playedGameIds.length) {
                throw new BadRequestException('Every played game must include its participants')
            }

            if (games.some(game => game.participantIds.some(participantId => !attendees.has(participantId)))) {
                throw new BadRequestException('Game participants must be invited session attendees')
            }
            if (personGames.some(game => game.participantIds.some(participantId => !personAttendees.has(participantId)))) {
                throw new BadRequestException('Game participants must be invited session attendees')
            }
        }

        const result =
            personIds.length > 0 && attendees.size === 0
                ? await this.databaseService.sessions.replaceMeetPlayedPersonGames(sessionId, personGames, status)
                : personIds.length > 0
                  ? await this.databaseService.sessions.replaceMeetPlayedGames(sessionId, games, status, personGames)
                  : await this.databaseService.sessions.replaceMeetPlayedGames(sessionId, games, status)

        if (result.applied === false) {
            throw new ConflictException('The session changed while played games were being updated. Reload and try again.')
        }

        const updatedSession = {
            playedGameIds: result.playedGameIds,
            skippedGameIds: result.skippedGameIds,
            playedGameParticipants: result.playedGameParticipants,
        }

        return {
            sessionId,
            ...updatedSession,
            ...(personIds.length > 0 ? { playedGamePersonParticipants: await this.getMeetPlayedGameParticipants(sessionId) } : {}),
        }
    }

    async updateSessionRsvp(actorAccountId: number, sessionId: number, body: UpdateSessionRsvpBody): Promise<SessionRsvpUpdatedDto> {
        const attendee = await this.databaseService.sessions.getMeetAttendeeForAccount(sessionId, actorAccountId)
        const personAttendee =
            attendee.rows.length === 0
                ? await this.databaseService.sessions.getMeetPersonAttendeeForAccount(sessionId, actorAccountId)
                : null

        if (attendee.rows.length === 0 && (!personAttendee || personAttendee.rows.length === 0)) {
            throw new ForbiddenException('You are not invited to this session')
        }

        const status = String((attendee.rows[0] ?? personAttendee?.rows[0])?.[5] ?? 'completed')

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot RSVP to a ${status} session`)
        }

        const result =
            attendee.rows.length > 0
                ? await this.databaseService.sessions.updateMeetAttendeeRsvp(sessionId, actorAccountId, body.rsvpStatus)
                : await this.databaseService.sessions.updateMeetPersonAttendeeRsvp(
                      sessionId,
                      Number(personAttendee?.rows[0]?.[1]),
                      body.rsvpStatus,
                  )

        if (result.rowsAffected !== 1) {
            throw new NotFoundException('Session invite not found')
        }

        return { sessionId, rsvpStatus: body.rsvpStatus }
    }

    async updateSessionAttendance(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionAttendanceBody,
    ): Promise<SessionAttendanceUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForCreator(sessionId, actorAccountId)

        const [sessionRow] = session.rows

        if (!sessionRow) {
            throw new ForbiddenException('Only the session organizer can record attendance')
        }

        const status = String(sessionRow[5] ?? 'completed')

        if (status !== 'active' && status !== 'completed') {
            throw new BadRequestException(`Cannot record attendance for a ${status} session`)
        }

        const invitedIds = new Set(await this.databaseService.sessions.getMeetAttendeeIds(sessionId))
        const invitedPersonIds = new Set(await this.getMeetPersonIds(sessionId))

        const attendedIds = body.attendedIds ?? []
        const attendedPersonIds = body.attendedPersonIds ?? []

        if (attendedIds.some(accountId => !invitedIds.has(accountId))) {
            throw new BadRequestException('Attendance can only be recorded for invited members')
        }

        if (attendedPersonIds.some(groupPersonId => !invitedPersonIds.has(groupPersonId))) {
            throw new BadRequestException('Attendance can only be recorded for invited group people')
        }

        if (invitedIds.size > 0) {
            await this.databaseService.sessions.updateMeetAttendance(sessionId, attendedIds)
        }
        if (invitedPersonIds.size > 0) {
            await this.databaseService.sessions.updateMeetPersonAttendance(sessionId, attendedPersonIds)
        }

        return { sessionId, attendedIds, attendedPersonIds: invitedPersonIds.size > 0 ? attendedPersonIds : undefined }
    }

    /**
     * Replaces who won one played game, and their scores. Any member of the
     * group can record results, also after the session is completed.
     */
    async updateGameResults(
        actorAccountId: number,
        sessionId: number,
        gameId: number,
        body: UpdateGameResultsBody,
    ): Promise<GameResultsUpdatedDto> {
        const session = await this.databaseService.sessions.getMeetByIdForAccount(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        const participants = await this.databaseService.sessions.getPlayedGameParticipantIds(sessionId, gameId)

        if (!participants.played) {
            throw new BadRequestException('Results can only be recorded for a game marked as played')
        }

        const accountIds = new Set(participants.accountIds)
        const personIds = new Set(participants.personIds)
        const seen = new Set<string>()
        const results = []

        for (const entry of body.results) {
            const hasAccount = entry.accountId !== undefined
            const hasPerson = entry.groupPersonId !== undefined

            if (hasAccount === hasPerson) {
                throw new BadRequestException('Each result names exactly one of accountId or groupPersonId')
            }

            const key = hasAccount ? `a${entry.accountId}` : `p${entry.groupPersonId}`
            const played = hasAccount ? accountIds.has(entry.accountId as number) : personIds.has(entry.groupPersonId as number)

            if (!played) {
                throw new BadRequestException('Only people who played this game can have a result')
            }
            if (seen.has(key)) {
                throw new BadRequestException('Each person may only have one result per game')
            }
            seen.add(key)

            const score = entry.score ?? null

            // A loser without a score says nothing the absence of a row doesn't.
            if (!entry.isWinner && score === null) continue

            results.push({
                accountId: hasAccount ? (entry.accountId as number) : null,
                groupPersonId: hasPerson ? (entry.groupPersonId as number) : null,
                isWinner: entry.isWinner,
                score,
            })
        }

        await this.databaseService.sessions.replaceGameResults(sessionId, gameId, results)

        return { sessionId, gameId, results }
    }

    // Call queries on their domain object (databaseService.groups / .sessions): they read
    // this.database, so calling them with databaseService as `this` fails at runtime.
    private async getMeetPersonIds(sessionId: number): Promise<Array<number>> {
        const sessions = this.databaseService.sessions

        return typeof sessions.getMeetPersonIds === 'function' ? sessions.getMeetPersonIds(sessionId) : []
    }

    private async getGroupPeople(groupId: number) {
        const groups = this.databaseService.groups

        return typeof groups.getGroupPeople === 'function' ? groups.getGroupPeople(groupId) : { rows: [] }
    }

    private async getGroupAvailableGameIdsForPeople(groupId: number, groupPersonIds: Array<number>): Promise<Array<number>> {
        if (groupPersonIds.length === 0) return []
        const groups = this.databaseService.groups

        return typeof groups.getGroupAvailableGameIdsForPeople === 'function'
            ? groups.getGroupAvailableGameIdsForPeople(groupId, groupPersonIds)
            : []
    }

    private async getMeetPlayedGameParticipants(meetId: number): Promise<Array<{ gameId: number; participantIds: Array<number> }>> {
        const sessions = this.databaseService.sessions

        return typeof sessions.getMeetPlayedGamePersonParticipants === 'function'
            ? sessions.getMeetPlayedGamePersonParticipants(meetId)
            : []
    }
}
