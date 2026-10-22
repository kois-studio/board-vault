import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { mapMeetDetailsResult } from '../../../common/mappers/meet-details.mapper.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type {
    CorrectSessionBody,
    CreatePlaySessionBody,
    PlaySessionGameBody,
    SessionRecordingDto,
} from '../../../common/types/session.type.js'

export function mergeGames(games: Array<{ gameId: number; participantIds: number[] }>) {
    const merged = new Map<number, Set<number>>()

    for (const game of games) merged.set(game.gameId, new Set([...(merged.get(game.gameId) ?? []), ...game.participantIds]))
    return [...merged].map(([gameId, participants]) => ({ gameId, participantIds: [...participants] }))
}

/** Actual play is independent of ownership. Validate catalogue ids, selected identities and results. */
export async function validateRecordingGames(database: DatabaseService, body: CreatePlaySessionBody): Promise<void> {
    try {
        new Intl.DateTimeFormat('en', { timeZone: body.timezone }).format()
    } catch {
        throw new BadRequestException('Choose a valid timezone')
    }
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: body.timezone, year: 'numeric', month: '2-digit', day: '2-digit' })

    if (!Number.isFinite(Date.parse(body.sessionDate)) || day.format(new Date(body.sessionDate)) > day.format(new Date()))
        throw new BadRequestException('Choose a day that has already happened')
    const gameIds = [...new Set(body.games.map(game => game.gameId))]
    const existing = new Set(await database.games.getExistingGameIds(gameIds))

    if (gameIds.some(id => !existing.has(id))) throw new BadRequestException('Every played game must exist in the catalogue')
    const accounts = new Set(body.attendeeIds ?? [])
    const people = new Set(body.groupPersonIds ?? [])

    if (!accounts.size && !people.size) throw new BadRequestException('Choose who came')
    for (const play of body.games) {
        if (!(play.participantIds?.length || play.participantPersonIds?.length))
            throw new BadRequestException('Choose at least one player for each play')
        if (play.participantIds?.some(id => !accounts.has(id)) || play.participantPersonIds?.some(id => !people.has(id)))
            throw new BadRequestException('Players must be selected attendees')
        const seen = new Set<string>()

        for (const result of play.results ?? []) {
            if ((result.accountId !== undefined) === (result.groupPersonId !== undefined))
                throw new BadRequestException('Each result names exactly one person')
            const key = result.accountId === undefined ? `p${result.groupPersonId}` : `a${result.accountId}`

            if (seen.has(key)) throw new BadRequestException('Only one result per person per play')
            seen.add(key)
            if (
                result.accountId !== undefined
                    ? !play.participantIds?.includes(result.accountId)
                    : !play.participantPersonIds?.includes(result.groupPersonId as number)
            )
                throw new BadRequestException('Results must belong to players of this play')
        }
    }
}

@Injectable()
export class SessionRecordingService {
    constructor(private readonly database: DatabaseService) {}

    async get(actorId: number, sessionId: number): Promise<SessionRecordingDto> {
        // Read revision first: any change during the following reads makes this token stale safely.
        const revision = await this.database.recordings.getRecordingRevision(sessionId)
        const session = mapMeetDetailsResult(await this.database.sessions.getMeetDetailsByIdForAccount(sessionId, actorId))

        if (!session) throw new NotFoundException('Session not found')
        const recorded = await this.database.recordings.getRecordedPlays(sessionId)
        const games: PlaySessionGameBody[] = recorded.length
            ? recorded
            : session.playedGames.map(gameId => ({
                  gameId,
                  participantIds: session.playedGameParticipants.find(game => game.gameId === gameId)?.participantIds.length
                      ? session.playedGameParticipants.find(game => game.gameId === gameId)?.participantIds
                      : undefined,
                  participantPersonIds: session.playedGamePersonParticipants?.find(game => game.gameId === gameId)?.participantIds.length
                      ? session.playedGamePersonParticipants?.find(game => game.gameId === gameId)?.participantIds
                      : undefined,
                  results: (session.gameResults?.find(game => game.gameId === gameId)?.results ?? []).map(result => ({
                      ...(result.accountId === null ? { groupPersonId: result.groupPersonId as number } : { accountId: result.accountId }),
                      isWinner: result.isWinner,
                      score: result.score,
                  })),
              }))

        const recording: SessionRecordingDto = {
            groupId: session.groupId,
            sessionDate: session.meetDate,
            timezone: session.timezone,
            notes: session.notes ?? undefined,
            attendeeIds:
                session.status === 'completed'
                    ? [
                          ...new Set([
                              ...session.attendeeStatuses
                                  .filter(person => person.attendanceStatus === 'attended')
                                  .map(person => person.accountId),
                              ...session.playedGameParticipants.flatMap(game => game.participantIds),
                          ]),
                      ]
                    : session.attendees.length
                      ? session.attendees
                      : undefined,
            groupPersonIds:
                session.status === 'completed'
                    ? [
                          ...new Set([
                              ...(session.participantStatuses ?? [])
                                  .filter(person => person.attendanceStatus === 'attended')
                                  .map(person => person.groupPersonId),
                              ...(session.playedGamePersonParticipants ?? []).flatMap(game => game.participantIds),
                          ]),
                      ]
                    : session.participants?.length
                      ? session.participants
                      : undefined,
            games,
            revision,
        }

        if (!recording.attendeeIds?.length) delete recording.attendeeIds
        if (!recording.groupPersonIds?.length) delete recording.groupPersonIds
        return recording
    }

    async correct(actorId: number, sessionId: number, body: CorrectSessionBody): Promise<SessionRecordingDto> {
        const [access] = (await this.database.sessions.getMeetAccessForAccount(sessionId, actorId)).rows

        if (!access) throw new NotFoundException('Session not found')
        if (Number(access[1]) !== body.groupId) throw new BadRequestException('A session cannot move to another group')
        if (!['active', 'completed'].includes(String(access[5])))
            throw new BadRequestException('Only active or completed sessions can be corrected')
        if (Number(access[2]) !== actorId && Number(access[8]) !== 1 && (!access[9] || access[9] === 'declined'))
            throw new ForbiddenException('Only the organizer, group owner or a player may correct a session')
        const previous = await this.get(actorId, sessionId)
        const organizer = Number(access[2]) === actorId || Number(access[8]) === 1
        const same = (left: number[] = [], right: number[] = []) =>
            [...left].sort((a, b) => a - b).join(',') === [...right].sort((a, b) => a - b).join(',')

        if (
            String(access[5]) === 'active' &&
            !organizer &&
            (!same(body.attendeeIds, previous.attendeeIds) || !same(body.groupPersonIds, previous.groupPersonIds))
        )
            throw new ForbiddenException('Only the organizer or group owner may change who is invited while a night is active')
        const members = new Set(await this.database.groups.getGroupMemberIds(body.groupId))

        if (body.attendeeIds?.some(id => !members.has(id) && !previous.attendeeIds?.includes(id)))
            throw new BadRequestException('New attendees must be group members')
        const groupPeople = await this.database.groups.getGroupPeople(body.groupId, true)
        const allowedPeople = new Set(
            groupPeople.rows
                .filter(row => (row[4] === 'active' && row[10] === 'member') || previous.groupPersonIds?.includes(Number(row[0])))
                .map(row => Number(row[0])),
        )

        if (body.groupPersonIds?.some(id => !allowedPeople.has(id))) throw new BadRequestException('People must belong to this group')
        await validateRecordingGames(this.database, body)
        if (!(await this.database.recordings.correctRecording(sessionId, actorId, body)))
            throw new ConflictException(
                'This session changed while you were editing. Reload it before trying again; your changes have not been saved.',
            )
        return this.get(actorId, sessionId)
    }

    async results(
        actorId: number,
        sessionId: number,
        position: number,
        body: { revision: number; results: PlaySessionGameBody['results'] },
    ): Promise<SessionRecordingDto> {
        const recording = await this.get(actorId, sessionId)
        const play = recording.games[position]

        if (!play) throw new NotFoundException('Play not found')
        const games = recording.games.map((item, index) => (index === position ? { ...item, results: body.results } : item))
        const correction = { ...recording, games, revision: body.revision }

        await validateRecordingGames(this.database, correction)
        if (!(await this.database.recordings.replacePlayResults(sessionId, actorId, correction)))
            throw new ConflictException('The session changed. Reload before saving these results.')
        return this.get(actorId, sessionId)
    }
}
