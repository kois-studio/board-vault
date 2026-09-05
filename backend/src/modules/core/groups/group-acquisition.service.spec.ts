import { GroupAcquisitionService } from './group-acquisition.service'

import type { DatabaseService } from '../../common/database/database.service'

describe('GroupAcquisitionService', () => {
    it('aggregates member interest into group-level entries', async () => {
        const database = {
            getGroupAcquisitionBoard: jest.fn().mockResolvedValue({
                rows: [
                    [
                        42,
                        'image',
                        90,
                        2,
                        5,
                        'Game',
                        'Juego',
                        '2026-09-03 20:00:00',
                        1,
                        'example-contributor',
                        'example-user',
                        JSON.stringify({ backgroundColor: '#000', iconName: null, emoji: '🎲', type: 'emoji', initials: 'D' }),
                        2,
                        0,
                    ],
                    [
                        42,
                        'image',
                        90,
                        2,
                        5,
                        'Game',
                        'Juego',
                        '2026-09-03 20:00:00',
                        2,
                        'friend',
                        'Friend',
                        JSON.stringify({ backgroundColor: '#fff', iconName: null, emoji: null, type: 'initials', initials: 'F' }),
                        2,
                        0,
                    ],
                ],
            }),
        }
        const service = new GroupAcquisitionService(database as unknown as DatabaseService)

        await expect(service.getBoard(7)).resolves.toMatchObject([
            {
                gameData: expect.objectContaining({ id: 42, titleTranslations: { en: 'Game', es: 'Juego' } }),
                interestedBy: [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })],
                interestCount: 2,
                ownerCount: 0,
            },
        ])
    })

    it('rejects adding a game the group already owns', async () => {
        const database = {
            getGameById: jest.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: jest.fn().mockResolvedValue([42]),
            addGroupGameInterest: jest.fn(),
        }
        const service = new GroupAcquisitionService(database as unknown as DatabaseService)

        await expect(service.addInterest(7, 1, { gameId: 42 })).rejects.toThrow('This group already owns the selected game')
        expect(database.addGroupGameInterest).not.toHaveBeenCalled()
    })

    it('persists interest for a catalog game not owned by the group', async () => {
        const database = {
            getGameById: jest.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: jest.fn().mockResolvedValue([]),
            addGroupGameInterest: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
        }
        const service = new GroupAcquisitionService(database as unknown as DatabaseService)

        await expect(service.addInterest(7, 1, { gameId: 42 })).resolves.toEqual({ success: true })
        expect(database.addGroupGameInterest).toHaveBeenCalledWith(7, 1, { gameId: 42 })
    })

    it('reports ownership when the atomic insert loses a race to a group purchase', async () => {
        const database = {
            getGameById: jest.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([42]),
            addGroupGameInterest: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
        }
        const service = new GroupAcquisitionService(database as unknown as DatabaseService)

        await expect(service.addInterest(7, 1, { gameId: 42 })).rejects.toThrow('This group already owns the selected game')
        expect(database.getGroupAvailableGameIds).toHaveBeenCalledTimes(2)
    })
})
