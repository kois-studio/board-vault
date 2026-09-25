import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { mapMeetDetailsResult } from '../../../common/mappers/meet-details.mapper'
import { DatabaseService } from '../../common/database/database.service'

import type { MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
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
} from '../../../common/types/session.type'

@Injectable()
export class SessionsService {
    constructor(private readonly databaseService: DatabaseService) {}

    async getSessionDetails(actorAccountId: number, sessionId: number): Promise<MeetWithAttendeesAndGames> {
        const result = await this.databaseService.getMeetDetailsByIdForAccount(sessionId, actorAccountId)
        const session = mapMeetDetailsResult(result)

        if (!session) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        return session
    }

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

        const attendeeIds = [...new Set(body.attendeeIds ?? [])]
        const groupPersonIds = [...new Set(body.groupPersonIds ?? [])]
        const usesGroupPeople = groupPersonIds.length > 0

        if (attendeeIds.length === 0 && groupPersonIds.length === 0) {
            throw new BadRequestException('A completed session must have at least one attendee')
        }

        if (attendeeIds.length > 0 && groupPersonIds.length > 0) {
            throw new BadRequestException('Choose either account attendees or group people for a session')
        }

        if (attendeeIds.some(accountId => !memberIdSet.has(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        if (usesGroupPeople) {
            const people = await this.databaseService.getGroupPeople(body.groupId)
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

        if (usesGroupPeople && personGames.some(game => game.participantIds.length === 0)) {
            throw new BadRequestException('Every played game must have at least one participant')
        }

        if (!usesGroupPeople && games.some(game => game.participantIds.length === 0)) {
            throw new BadRequestException('Every played game must have at least one participant')
        }

        const availableGameIds = new Set(
            await (usesGroupPeople
                ? this.databaseService.getGroupAvailableGameIdsForPeople(body.groupId, groupPersonIds)
                : this.databaseService.getGroupAvailableGameIds(body.groupId)),
        )

        if (gameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every game must be owned by at least one group member')
        }

        const selectedParticipantIds = new Set(usesGroupPeople ? groupPersonIds : attendeeIds)
        const selectedGames = usesGroupPeople ? personGames : games

        for (const game of selectedGames) {
            if (game.participantIds.some(participantId => !selectedParticipantIds.has(participantId))) {
                throw new BadRequestException(
                    usesGroupPeople ? 'Game participants must be selected group people' : 'Game participants must be selected attendees',
                )
            }
        }

        const result = await this.databaseService.createCompletedSession({
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
        const group = await this.databaseService.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(body.groupId)

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

        if (attendeeIds.length > 0 && groupPersonIds.length > 0) {
            throw new BadRequestException('Choose either account attendees or group people for a session')
        }

        if (selectedAccountIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        if (usesGroupPeople) {
            const people = await this.databaseService.getGroupPeople(body.groupId)
            const activePeople = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

            if (groupPersonIds.some(groupPersonId => !activePeople.has(groupPersonId))) {
                throw new BadRequestException('Every participant must be active in the selected group')
            }
        }

        const plannedGameIds = [...new Set(body.plannedGameIds ?? [])]
        const availableGameIds = new Set(
            await (usesGroupPeople
                ? this.databaseService.getGroupAvailableGameIdsForPeople(body.groupId, groupPersonIds)
                : this.databaseService.getGroupAvailableGameIds(body.groupId)),
        )

        if (plannedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every planned game must be owned by at least one group member')
        }

        const result = await this.databaseService.createScheduledSession({
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
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can change its status')
        }

        const currentStatus = String(session.rows[0][5] ?? 'completed') as SessionStatusUpdatedDto['status']
        const allowedTransitions: Record<SessionStatusUpdatedDto['status'], Array<UpdateSessionStatusBody['status']>> = {
            scheduled: ['active', 'cancelled'],
            active: ['completed', 'cancelled'],
            completed: [],
            cancelled: [],
        }

        if (!allowedTransitions[currentStatus].includes(body.status)) {
            throw new BadRequestException(`Cannot change a ${currentStatus} session to ${body.status}`)
        }

        const result = await this.databaseService.updateMeetStatus(sessionId, currentStatus, body.status)

        if (result.rowsAffected !== 1) {
            throw new NotFoundException(`Session with id ${sessionId} not found`)
        }

        return { sessionId, status: body.status }
    }

    async updateSessionAttendees(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionAttendeesBody,
    ): Promise<SessionAttendeesUpdatedDto> {
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can manage attendees')
        }

        const attendeeIds = [...new Set(body.attendeeIds ?? [])]
        const groupPersonIds = [...new Set(body.groupPersonIds ?? [])]

        if (attendeeIds.length === 0 && groupPersonIds.length === 0) {
            throw new BadRequestException('A session must retain at least one attendee')
        }

        if (attendeeIds.length > 0 && groupPersonIds.length > 0) {
            throw new BadRequestException('Choose either account attendees or group people for a session')
        }

        const status = String(session.rows[0][5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit attendees on a ${status} session`)
        }

        const groupId = Number(session.rows[0][1])
        const memberIds = await this.databaseService.getGroupMemberIds(groupId)

        if (attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the session group')
        }

        const people = await this.databaseService.getGroupPeople(groupId)
        const activePeople = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

        if (groupPersonIds.some(groupPersonId => !activePeople.has(groupPersonId))) {
            throw new BadRequestException('Every participant must be active in the session group')
        }

        const nextAttendeeIds = new Set(attendeeIds)
        const nextPersonIds = new Set(groupPersonIds)
        const existingPersonIds = await this.databaseService.getMeetPersonIds(sessionId)
        const playedGameParticipants =
            existingPersonIds.length > 0
                ? await this.databaseService.getMeetPlayedGamePersonParticipants(sessionId)
                : await this.databaseService.getMeetPlayedGameParticipants(sessionId)

        if (
            playedGameParticipants.some(game =>
                game.participantIds.some(participantId =>
                    existingPersonIds.length > 0 ? !nextPersonIds.has(participantId) : !nextAttendeeIds.has(participantId),
                ),
            )
        ) {
            throw new BadRequestException('A member who played a recorded game cannot be removed from the session attendees')
        }

        const applied =
            existingPersonIds.length > 0
                ? await this.databaseService.replaceMeetPersonAttendees(sessionId, groupPersonIds, status)
                : await this.databaseService.replaceMeetAttendees(sessionId, attendeeIds, status)

        if (applied === false) {
            throw new ConflictException('The session changed while attendees were being updated. Reload and try again.')
        }
        return { sessionId, attendeeIds, groupPersonIds: groupPersonIds.length > 0 ? groupPersonIds : undefined }
    }

    async updateSessionShortlist(
        actorAccountId: number,
        sessionId: number,
        body: UpdateSessionShortlistBody,
    ): Promise<SessionShortlistUpdatedDto> {
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can manage the shortlist')
        }

        const status = String(session.rows[0][5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit the shortlist on a ${status} session`)
        }

        const groupId = Number(session.rows[0][1])
        const personIds = await this.databaseService.getMeetPersonIds(sessionId)
        const availableGameIds = new Set(
            await (personIds.length > 0
                ? this.databaseService.getGroupAvailableGameIdsForPeople(groupId, personIds)
                : this.databaseService.getGroupAvailableGameIds(groupId)),
        )
        const plannedGameIds = [...new Set(body.plannedGameIds)]

        if (plannedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every planned game must be owned by at least one group member')
        }

        const applied = await this.databaseService.replaceMeetPlannedGames(sessionId, plannedGameIds, status)

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
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can record games played')
        }

        const status = String(session.rows[0][5] ?? 'completed') as SessionStatusUpdatedDto['status']

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot edit played games on a ${status} session`)
        }

        const groupId = Number(session.rows[0][1])
        const personIds = await this.databaseService.getMeetPersonIds(sessionId)
        const availableGameIds = new Set(
            await (personIds.length > 0
                ? this.databaseService.getGroupAvailableGameIdsForPeople(groupId, personIds)
                : this.databaseService.getGroupAvailableGameIds(groupId)),
        )
        const playedGameIds = [...new Set(body.playedGameIds)]

        if (playedGameIds.some(gameId => !availableGameIds.has(gameId))) {
            throw new BadRequestException('Every played game must be owned by at least one group member')
        }

        const attendees = new Set(await this.databaseService.getMeetAttendeeIds(sessionId))
        const personAttendees = new Set(personIds)
        const existingParticipants = body.games
            ? []
            : personIds.length > 0
              ? await this.databaseService.getMeetPlayedGamePersonParticipants(sessionId)
              : await this.databaseService.getMeetPlayedGameParticipants(sessionId)
        const games = body.games
            ? body.games.map(game => ({
                  gameId: game.gameId,
                  participantIds: [...new Set(personIds.length > 0 ? (game.participantPersonIds ?? []) : (game.participantIds ?? []))],
              }))
            : playedGameIds.map(gameId => ({
                  gameId,
                  participantIds: existingParticipants.find(existing => existing.gameId === gameId)?.participantIds ?? [],
              }))

        if (body.games) {
            const detailedGameIds = games.map(game => game.gameId)

            if (games.some(game => game.participantIds.length === 0)) {
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

            if (
                games.some(game =>
                    game.participantIds.some(
                        participantId => !(personIds.length > 0 ? personAttendees.has(participantId) : attendees.has(participantId)),
                    ),
                )
            ) {
                throw new BadRequestException('Game participants must be invited session attendees')
            }
        }

        const result =
            personIds.length > 0
                ? await this.databaseService.replaceMeetPlayedPersonGames(sessionId, games, status)
                : await this.databaseService.replaceMeetPlayedGames(sessionId, games, status)

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
            ...(personIds.length > 0 ? { playedGamePersonParticipants: result.playedGameParticipants } : {}),
        }
    }

    async updateSessionRsvp(actorAccountId: number, sessionId: number, body: UpdateSessionRsvpBody): Promise<SessionRsvpUpdatedDto> {
        const attendee = await this.databaseService.getMeetAttendeeForAccount(sessionId, actorAccountId)
        const personAttendee =
            attendee.rows.length === 0 ? await this.databaseService.getMeetPersonAttendeeForAccount(sessionId, actorAccountId) : null

        if (attendee.rows.length === 0 && (!personAttendee || personAttendee.rows.length === 0)) {
            throw new ForbiddenException('You are not invited to this session')
        }

        const status = String((attendee.rows[0] ?? personAttendee?.rows[0])?.[5] ?? 'completed')

        if (status !== 'scheduled' && status !== 'active') {
            throw new BadRequestException(`Cannot RSVP to a ${status} session`)
        }

        const result =
            attendee.rows.length > 0
                ? await this.databaseService.updateMeetAttendeeRsvp(sessionId, actorAccountId, body.rsvpStatus)
                : await this.databaseService.updateMeetPersonAttendeeRsvp(sessionId, Number(personAttendee?.rows[0]?.[1]), body.rsvpStatus)

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
        const session = await this.databaseService.getMeetByIdForCreator(sessionId, actorAccountId)

        if (session.rows.length === 0) {
            throw new ForbiddenException('Only the session organizer can record attendance')
        }

        const status = String(session.rows[0][5] ?? 'completed')

        if (status !== 'active' && status !== 'completed') {
            throw new BadRequestException(`Cannot record attendance for a ${status} session`)
        }

        const invitedIds = new Set(await this.databaseService.getMeetAttendeeIds(sessionId))
        const invitedPersonIds = new Set(await this.databaseService.getMeetPersonIds(sessionId))

        const attendedIds = body.attendedIds ?? []
        const attendedPersonIds = body.attendedPersonIds ?? []

        if (attendedIds.length > 0 && attendedPersonIds.length > 0) {
            throw new BadRequestException('Choose either account attendance or group-person attendance')
        }

        if (attendedIds.some(accountId => !invitedIds.has(accountId))) {
            throw new BadRequestException('Attendance can only be recorded for invited members')
        }

        if (attendedPersonIds.some(groupPersonId => !invitedPersonIds.has(groupPersonId))) {
            throw new BadRequestException('Attendance can only be recorded for invited group people')
        }

        if (invitedPersonIds.size > 0) {
            await this.databaseService.updateMeetPersonAttendance(sessionId, attendedPersonIds)
            return { sessionId, attendedIds: [], attendedPersonIds }
        }

        await this.databaseService.updateMeetAttendance(sessionId, attendedIds)
        return { sessionId, attendedIds }
    }
}
