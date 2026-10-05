import { BadRequestException, ForbiddenException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database.js'

import { MeetAccountGamesService } from './meet-account-games.service.js'

describe('MeetAccountGamesService access boundaries', () => {
    it('rejects play records for a meet outside the authenticated account group', async () => {
        const getMeetByIdForAccount = vi.fn().mockResolvedValue({ rows: [] })
        const createMeetAccountGame = vi.fn()
        const service = new MeetAccountGamesService(fakeDatabase({ getMeetByIdForAccount, createMeetAccountGame }))

        await expect(service.createMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(createMeetAccountGame).not.toHaveBeenCalled()
    })

    it('rejects a legacy play record for a game not owned by the meet group', async () => {
        const getMeetByIdForAccount = vi.fn().mockResolvedValue({ rows: [[12, 5]] })
        const getGroupAvailableGameIds = vi.fn().mockResolvedValue([42])
        const createMeetAccountGame = vi.fn()
        const service = new MeetAccountGamesService(
            fakeDatabase({
                getMeetByIdForAccount,
                getGroupAvailableGameIds,
                createMeetAccountGame,
            }),
        )

        await expect(service.createMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(BadRequestException)
        expect(getGroupAvailableGameIds).toHaveBeenCalledWith(5)
        expect(createMeetAccountGame).not.toHaveBeenCalled()
    })

    it('allows a legacy play record for a game owned by a meet-group member', async () => {
        const getMeetByIdForAccount = vi.fn().mockResolvedValue({ rows: [[12, 5]] })
        const getGroupAvailableGameIds = vi.fn().mockResolvedValue([21])
        const createMeetAccountGame = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new MeetAccountGamesService(
            fakeDatabase({
                getMeetByIdForAccount,
                getGroupAvailableGameIds,
                createMeetAccountGame,
            }),
        )

        await expect(service.createMeetAccountGameForAccount(8, 12, 21)).resolves.toEqual({ accountId: 8, meetId: 12, gameId: 21 })
        expect(createMeetAccountGame).toHaveBeenCalledWith(8, 12, 21)
    })

    it('checks group membership before deleting a play record', async () => {
        const getMeetByIdForAccount = vi.fn().mockResolvedValue({ rows: [] })
        const deleteMeetAccountGame = vi.fn()
        const service = new MeetAccountGamesService(fakeDatabase({ getMeetByIdForAccount, deleteMeetAccountGame }))

        await expect(service.deleteMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(deleteMeetAccountGame).not.toHaveBeenCalled()
    })
})
