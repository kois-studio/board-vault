import { fakeDatabase } from '../../../../test/fake-database.js'

import { GroupAcquisitionService } from './group-acquisition.service.js'

describe('GroupAcquisitionService', () => {
    it('aggregates member interest into group-level entries', async () => {
        const database = {
            getGroupAcquisitionBoard: vi.fn().mockResolvedValue({
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
                        'organizer',
                        'Organizer',
                        JSON.stringify({ backgroundColor: '#000', iconName: null, emoji: '🎲', type: 'emoji', initials: 'O' }),
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
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.getBoard(7)).resolves.toMatchObject([
            {
                gameData: expect.objectContaining({ id: 42, titleTranslations: { en: 'Game', es: 'Juego' } }),
                interestedBy: [expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })],
                interestCount: 2,
                ownerCount: 0,
                decisionStatus: 'open',
                decisionAt: null,
                decisionBy: null,
            },
        ])
    })

    it('rejects adding a game the group already owns', async () => {
        const database = {
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: vi.fn().mockResolvedValue([42]),
            addGroupGameInterestAndReopenDecision: vi.fn(),
        }
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.addInterest(7, 1, { gameId: 42 })).rejects.toThrow('This group already owns the selected game')
        expect(database.addGroupGameInterestAndReopenDecision).not.toHaveBeenCalled()
    })

    it('persists interest for a catalog game not owned by the group', async () => {
        const database = {
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: vi.fn().mockResolvedValue([]),
            addGroupGameInterestAndReopenDecision: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        }
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.addInterest(7, 1, { gameId: 42 })).resolves.toEqual({ success: true })
        expect(database.addGroupGameInterestAndReopenDecision).toHaveBeenCalledWith(7, 1, 42)
    })

    it('reports ownership when the atomic insert loses a race to a group purchase', async () => {
        const database = {
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([42]),
            addGroupGameInterestAndReopenDecision: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
        }
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.addInterest(7, 1, { gameId: 42 })).rejects.toThrow('This group already owns the selected game')
        expect(database.getGroupAvailableGameIds).toHaveBeenCalledTimes(2)
    })

    it('persists an owner decision for an unowned game', async () => {
        const database = {
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: vi.fn().mockResolvedValue([]),
            upsertGroupAcquisitionDecision: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        }
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.updateDecision(7, 1, 42, { status: 'planned', note: 'Buy before autumn' })).resolves.toEqual({ success: true })
        expect(database.upsertGroupAcquisitionDecision).toHaveBeenCalledWith(7, 42, 1, 'planned', 'Buy before autumn')
    })

    it('rejects an owner decision when the group already owns the game', async () => {
        const database = {
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            getGroupAvailableGameIds: vi.fn().mockResolvedValue([42]),
            upsertGroupAcquisitionDecision: vi.fn(),
        }
        const service = new GroupAcquisitionService(fakeDatabase(database))

        await expect(service.updateDecision(7, 1, 42, { status: 'not_now' })).rejects.toThrow('This group already owns the selected game')
        expect(database.upsertGroupAcquisitionDecision).not.toHaveBeenCalled()
    })
})
