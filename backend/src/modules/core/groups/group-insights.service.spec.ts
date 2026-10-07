import { fakeDatabase } from '../../../../test/fake-database.js'

import { GroupInsightsService } from './group-insights.service.js'

describe('GroupInsightsService', () => {
    const emoji = JSON.stringify({ backgroundColor: '#000', iconName: null, emoji: '🎲', type: 'emoji', initials: '' })

    it('maps standings, play counts and never-played games', async () => {
        const database = {
            getGroupInsights: vi.fn().mockResolvedValue({
                totals: { rows: [[2, 3, 1]] },
                standings: {
                    rows: [
                        [1, 4, 'Organizer', emoji, 2, 3, 1],
                        [null, 9, 'Guest', null, 1, 1, 0],
                    ],
                },
                mostPlayed: { rows: [[10, 'image', 60, 2, 4, 'Alpha', null, 2, '2026-09-08T18:00:00.000Z']] },
                neverPlayed: { rows: [[13, 'image', 20, 3, 8, null, 'Delta', 5]] },
            }),
        }
        const service = new GroupInsightsService(fakeDatabase(database))

        const insights = await service.getInsights(7)

        expect(database.getGroupInsights).toHaveBeenCalledWith(7)
        expect(insights).toEqual({
            sessions: 2,
            gamesPlayed: 3,
            gamesWithWinner: 1,
            standings: [
                {
                    accountId: 1,
                    groupPersonId: 4,
                    displayName: 'Organizer',
                    avatar: JSON.parse(emoji),
                    sessions: 2,
                    gamesPlayed: 3,
                    wins: 1,
                },
                { accountId: null, groupPersonId: 9, displayName: 'Guest', avatar: null, sessions: 1, gamesPlayed: 1, wins: 0 },
            ],
            mostPlayed: [
                {
                    gameData: {
                        id: 10,
                        title: 'Alpha',
                        imageUrl: 'image',
                        gameAvgDuration: 60,
                        minPlayers: 2,
                        maxPlayers: 4,
                        titleTranslations: { en: 'Alpha', es: 'Alpha' },
                    },
                    sessions: 2,
                    lastPlayedAt: '2026-09-08T18:00:00.000Z',
                },
            ],
            neverPlayed: [
                {
                    id: 13,
                    title: 'Delta',
                    imageUrl: 'image',
                    gameAvgDuration: 20,
                    minPlayers: 3,
                    maxPlayers: 8,
                    titleTranslations: { en: 'Delta', es: 'Delta' },
                },
            ],
            neverPlayedCount: 5,
        })
    })

    it('returns empty insights for a group without completed nights', async () => {
        const empty = { rows: [] }
        const service = new GroupInsightsService(
            fakeDatabase({
                getGroupInsights: vi
                    .fn()
                    .mockResolvedValue({ totals: { rows: [[0, 0, 0]] }, standings: empty, mostPlayed: empty, neverPlayed: empty }),
            }),
        )

        await expect(service.getInsights(7)).resolves.toEqual({
            sessions: 0,
            gamesPlayed: 0,
            gamesWithWinner: 0,
            standings: [],
            mostPlayed: [],
            neverPlayed: [],
            neverPlayedCount: 0,
        })
    })
})
