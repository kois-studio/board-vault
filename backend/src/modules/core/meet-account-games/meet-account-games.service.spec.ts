import { BadRequestException, ForbiddenException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { MeetAccountGamesService } from './meet-account-games.service'

describe('MeetAccountGamesService access boundaries', () => {
    it('rejects play records for a meet outside the authenticated account group', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [] })
        const createMeetAccountGame = jest.fn()
        const service = new MeetAccountGamesService(fakeDatabase({ getMeetByIdForAccount, createMeetAccountGame }))

        await expect(service.createMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(createMeetAccountGame).not.toHaveBeenCalled()
    })

    it('rejects a legacy play record for a game not owned by the meet group', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [[12, 5]] })
        const getGroupAvailableGameIds = jest.fn().mockResolvedValue([42])
        const createMeetAccountGame = jest.fn()
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
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [[12, 5]] })
        const getGroupAvailableGameIds = jest.fn().mockResolvedValue([21])
        const createMeetAccountGame = jest.fn().mockResolvedValue({ rowsAffected: 1 })
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
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [] })
        const deleteMeetAccountGame = jest.fn()
        const service = new MeetAccountGamesService(fakeDatabase({ getMeetByIdForAccount, deleteMeetAccountGame }))

        await expect(service.deleteMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(deleteMeetAccountGame).not.toHaveBeenCalled()
    })
})
