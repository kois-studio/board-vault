import { fakeDatabase } from '../../../../test/fake-database.js'

import { PlayService } from './play.service.js'

import type { DatabaseService } from '../../common/database/database.service.js'
import type { GameTranslationService } from '../../core/game-translation/game-translation.service.js'
import type { GamesService } from '../../core/games/games.service.js'
import type { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service.js'
import type { MeetsService } from '../../core/meets/meets.service.js'
import type { UsersService } from '../../core/users/users.service.js'

describe('PlayService history', () => {
    it('includes only completed sessions in personal history, with a fixed number of queries', async () => {
        const meet = (id: number, status: string) => ({
            id,
            groupId: 7,
            createdBy: 1,
            meetDate: '2026-08-16T19:30:00.000Z',
            isConfirmed: true,
            status,
            timezone: 'Europe/Madrid',
        })
        const meets = { getMeetsByIdsForAccount: vi.fn().mockResolvedValue([meet(10, 'completed'), meet(11, 'cancelled')]) }
        const database = fakeDatabase({
            getDistinctCompletedMeetIdsForAccountHistory: vi.fn().mockResolvedValue([10, 11]),
            getHistoryDetailsByMeetIds: vi.fn().mockResolvedValue({
                attendedAccountIds: new Map([[10, [1]]]),
                attendedPersonIds: new Map(),
                playedGameIds: new Map([[10, [42]]]),
                personPlays: new Map(),
                accountPlays: new Map([[10, [{ gameId: 42, accountId: 1 }]]]),
            }),
            getGroupPeople: vi.fn().mockResolvedValue({ rows: [] }),
            getAccountStandings: vi.fn().mockResolvedValue({ rows: [{ groupId: 7, accountId: 1, standing: 'left' }] }),
        })
        const service = new PlayService(
            {
                getPublicUsersByIds: vi.fn().mockResolvedValue(new Map([[1, { id: 1, username: 'organizer' }]])),
            } as unknown as UsersService,
            database,
            { getGamesByIds: vi.fn().mockResolvedValue(new Map([[42, { id: 42, imageUrl: 'image' }]])) } as unknown as GamesService,
            meets as unknown as MeetsService,
            {} as unknown as MeetAccountGamesService,
            { getTranslationsByGameIds: vi.fn().mockResolvedValue(new Map([[42, { en: 'Game' }]])) } as unknown as GameTranslationService,
        )

        const history = await service.getUserGamesHistory(1)

        expect(history).toHaveLength(1)
        expect(history[0]?.gamesPlayed[0]?.playedBy.map(user => [user.id, user.standing])).toEqual([[1, 'left']])
        expect(meets.getMeetsByIdsForAccount).toHaveBeenCalledWith([10, 11], 1)
        expect(database.sessions.getHistoryDetailsByMeetIds).toHaveBeenCalledTimes(1)
        expect(database.sessions.getHistoryDetailsByMeetIds).toHaveBeenCalledWith([10])
    })

    it('links history people to their accounts and uses the account avatar when the person has none', async () => {
        const accountAvatar = { backgroundColor: '#EF4444', iconName: null, emoji: '😎', type: 'emoji', initials: '' }
        const guestAvatar = { backgroundColor: '#64748B', iconName: null, emoji: null, type: 'initials', initials: 'GU' }
        const meets = {
            getMeetsByIdsForAccount: vi.fn().mockResolvedValue([
                {
                    id: 58,
                    groupId: 7,
                    createdBy: 6,
                    meetDate: '2026-10-01T10:00:00.000Z',
                    isConfirmed: true,
                    status: 'completed',
                    timezone: 'UTC',
                },
            ]),
        }
        // A session recorded only with group people: no MeetAttendee or MeetAccountGame rows.
        const database = fakeDatabase({
            getDistinctCompletedMeetIdsForAccountHistory: vi.fn().mockResolvedValue([58]),
            getHistoryDetailsByMeetIds: vi.fn().mockResolvedValue({
                attendedAccountIds: new Map(),
                attendedPersonIds: new Map([[58, [3, 9]]]),
                playedGameIds: new Map([[58, [42]]]),
                personPlays: new Map([
                    [
                        58,
                        [
                            { gameId: 42, personId: 3 },
                            { gameId: 42, personId: 9 },
                        ],
                    ],
                ]),
                accountPlays: new Map(),
            }),
            getGroupPeople: vi.fn().mockResolvedValue({
                rows: [
                    [3, 7, 6, 'linked', 'active', 'bloddsword', null, null, null, null, 'member'],
                    [9, 7, null, 'placeholder', 'active', 'Guest', JSON.stringify(guestAvatar), null, null, null, 'member'],
                ],
            }),
        })
        const usersService = {
            getPublicUsersByIds: vi.fn().mockImplementation(async (ids: Array<number>) => {
                const users = new Map([[6, { id: 6, username: 'Bloody', displayName: 'Bloody', avatar: accountAvatar }]])

                return new Map(ids.filter(id => users.has(id)).map(id => [id, users.get(id)]))
            }),
        }
        const service = new PlayService(
            usersService as unknown as UsersService,
            database,
            { getGamesByIds: vi.fn().mockResolvedValue(new Map([[42, { id: 42, imageUrl: 'image' }]])) } as unknown as GamesService,
            meets as unknown as MeetsService,
            {} as unknown as MeetAccountGamesService,
            { getTranslationsByGameIds: vi.fn().mockResolvedValue(new Map([[42, { en: 'Game' }]])) } as unknown as GameTranslationService,
        )

        const [record] = await service.getUserGamesHistory(6)

        const expectedPeople = [
            { id: 3, displayName: 'bloddsword', accountId: 6, avatar: accountAvatar, standing: 'member' },
            { id: 9, displayName: 'Guest', accountId: null, avatar: guestAvatar, standing: 'member' },
        ]

        expect(record?.attendedBy).toEqual([])
        expect(record?.attendedByPeople).toEqual(expectedPeople)
        expect(record?.gamesPlayed[0]?.playedByPeople).toEqual(expectedPeople)
    })

    it('sorts a user meet list without mutating the database response contract', async () => {
        const meets = {
            getMeetsForAccount: vi.fn().mockResolvedValue([
                { id: 1, meetDate: '2026-08-10T19:30:00.000Z' },
                { id: 2, meetDate: '2026-08-16T19:30:00.000Z' },
            ]),
        }
        const service = new PlayService(
            {} as UsersService,
            {} as DatabaseService,
            {} as GamesService,
            meets as unknown as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getUserMeets(1)).resolves.toEqual([
            { id: 2, meetDate: '2026-08-16T19:30:00.000Z' },
            { id: 1, meetDate: '2026-08-10T19:30:00.000Z' },
        ])
    })

    it('returns deterministic recommendations for selected attendees', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2, 3]),
            getRecommendationFeedbackForGroup: vi.fn().mockResolvedValue({ rows: [] }),
            getRecommendationCandidates: vi.fn().mockResolvedValue({
                rows: [
                    [42, 'image-42', 90, 2, 5, 'Better Game', 'Mejor juego', 2, 8, '2026-08-01T19:30:00.000Z'],
                    [21, 'image-21', 120, 2, 5, 'Long Game', 'Juego largo', 1, null, null],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.getRecommendations(1, {
                groupId: 7,
                attendeeIds: [1, 2],
                availableMinutes: 120,
            }),
        ).resolves.toMatchObject({
            recommendations: [
                expect.objectContaining({ gameData: expect.objectContaining({ id: 42 }), score: 91 }),
                expect.objectContaining({ gameData: expect.objectContaining({ id: 21 }), score: 70 }),
            ],
            noResultReason: null,
        })
        expect(database.getRecommendationCandidates).toHaveBeenCalledWith(7, [1, 2], 2, 120)
    })

    it('names selected group people when explaining participant recommendations', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1]),
            getGroupPeople: vi.fn().mockResolvedValue({
                rows: [
                    [12, 7, null, 'placeholder', 'active', 'Ana', null, null, null, null, 'member'],
                    [13, 7, 1, 'linked', 'active', 'Carlos', null, null, null, null, 'member'],
                ],
            }),
            getGroupPersonRecommendationCandidates: vi.fn().mockResolvedValue({
                rows: [[42, 'image-42', 90, 2, 5, 'Shared Game', 'Juego compartido', 2, null, null, 2]],
            }),
            getParticipantRecommendationFeedbackForGroup: vi.fn().mockResolvedValue({ rows: [] }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.getParticipantRecommendations(1, {
                groupId: 7,
                groupPersonIds: [12, 13],
            }),
        ).resolves.toMatchObject({
            recommendations: [
                expect.objectContaining({
                    explanation: expect.objectContaining({
                        reasons: expect.arrayContaining([
                            'Owned by 2 of 2 selected people',
                            'The preferences of the people coming favor this game',
                        ]),
                    }),
                }),
            ],
        })
    })

    it('applies the selected decision lens and explains its effect', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
            getRecommendationFeedbackForGroup: vi.fn().mockResolvedValue({ rows: [] }),
            getRecommendationCandidates: vi.fn().mockResolvedValue({
                rows: [
                    [42, 'image-42', 90, 2, 5, 'Played Game', 'Juego jugado', 2, 8, '2026-08-01T19:30:00.000Z'],
                    [21, 'image-21', 120, 2, 5, 'Fresh Game', 'Juego nuevo', 1, null, null],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.getRecommendations(1, {
                groupId: 7,
                attendeeIds: [1, 2],
                availableMinutes: 120,
                decisionLens: 'fresh',
            }),
        ).resolves.toMatchObject({
            decisionLens: 'fresh',
            recommendations: [
                expect.objectContaining({
                    gameData: expect.objectContaining({ id: 21 }),
                    score: 90,
                    explanation: expect.objectContaining({ reasons: expect.arrayContaining(['Not played by this group yet']) }),
                }),
                expect.objectContaining({
                    gameData: expect.objectContaining({ id: 42 }),
                    score: 79,
                    explanation: expect.objectContaining({ reasons: expect.arrayContaining(['Previously played by this group']) }),
                }),
            ],
        })
    })

    it('uses the latest selected-attendee feedback in the recommendation score and explanation', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
            getRecommendationCandidates: vi.fn().mockResolvedValue({
                rows: [[42, 'image-42', 90, 2, 5, 'Better Game', 'Mejor juego', 2, 8, null]],
            }),
            getRecommendationFeedbackForGroup: vi.fn().mockResolvedValue({
                rows: [
                    [8, 42, 1, 'interested', '2026-09-03 20:02:00'],
                    [7, 42, 1, 'not_for_us', '2026-09-03 20:01:00'],
                    [6, 42, 2, 'not_for_us', '2026-09-03 20:00:00'],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 2] })).resolves.toMatchObject({
            recommendations: [
                expect.objectContaining({
                    score: 74,
                    explanation: expect.objectContaining({ interestedCount: 1, notForUsCount: 1 }),
                }),
            ],
        })
    })

    it('rejects attendees who are not members of the selected group', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 99] })).rejects.toThrow(
            'Every attendee must belong to the selected group',
        )
    })

    it('explains which recommendation constraint produced an empty result', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
            getRecommendationCandidates: vi.fn().mockResolvedValue({ rows: [] }),
            getRecommendationCandidateCounts: vi.fn().mockResolvedValue({ rows: [[4, 2, 0]] }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 2], availableMinutes: 60 })).resolves.toMatchObject({
            noResultReason: 'No games for 2 players fit within 60 minutes.',
        })
        expect(database.getRecommendationCandidateCounts).toHaveBeenCalledWith([1, 2], 2, 60)
    })

    it('persists recommendation feedback only for selected-attendee-owned games', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2, 3]),
            getOwnedGameByAnyAccount: vi.fn().mockResolvedValue({ rows: [[1]] }),
            createRecommendationFeedback: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.createRecommendationFeedback(1, {
                groupId: 7,
                gameId: 42,
                attendeeIds: [1, 2],
                feedback: 'not_for_us',
            }),
        ).resolves.toEqual({ success: true })
        expect(database.createRecommendationFeedback).toHaveBeenCalledWith({
            accountId: 1,
            groupId: 7,
            gameId: 42,
            attendeeIds: '[1,2]',
            feedback: 'not_for_us',
        })
    })

    it('rejects recommendation feedback for games absent from selected attendees', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
            getOwnedGameByAnyAccount: vi.fn().mockResolvedValue({ rows: [] }),
            createRecommendationFeedback: vi.fn(),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.createRecommendationFeedback(1, {
                groupId: 7,
                gameId: 42,
                attendeeIds: [1, 2],
                feedback: 'not_for_us',
            }),
        ).rejects.toThrow('The selected attendees do not own this game')
        expect(database.createRecommendationFeedback).not.toHaveBeenCalled()
    })

    it('returns the latest group recommendation signals per member and game', async () => {
        const avatar = JSON.stringify({ backgroundColor: '#000', iconName: null, emoji: '🎲', type: 'emoji', initials: 'O' })
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([1, 2]),
            getRecommendationFeedbackForGroup: vi.fn().mockResolvedValue({
                rows: [
                    [5, 42, 1, 'not_for_us', '2026-09-03 20:02:00', 'organizer', 'Organizer', avatar],
                    [4, 42, 1, 'interested', '2026-09-03 20:01:00', 'organizer', 'Organizer', avatar],
                    [3, 42, 2, 'interested', '2026-09-03 20:00:00', 'friend', 'Friend', avatar],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendationSignals(1, 7)).resolves.toEqual({
            groupId: 7,
            signals: [
                {
                    gameId: 42,
                    interestedCount: 1,
                    notForUsCount: 1,
                    yourFeedback: 'not_for_us',
                    interestedBy: [{ id: 2, username: 'friend', displayName: 'Friend', avatar: JSON.parse(avatar) }],
                    lastUpdatedAt: '2026-09-03 20:02:00',
                },
            ],
        })
    })

    it('rejects recommendation signals for non-members', async () => {
        const database = {
            getGroupById: vi.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: vi.fn().mockResolvedValue([2]),
            getRecommendationFeedbackForGroup: vi.fn(),
        }
        const service = new PlayService(
            {} as UsersService,
            fakeDatabase(database),
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendationSignals(1, 7)).rejects.toThrow('You must belong to the group to view recommendation signals')
        expect(database.getRecommendationFeedbackForGroup).not.toHaveBeenCalled()
    })
})
