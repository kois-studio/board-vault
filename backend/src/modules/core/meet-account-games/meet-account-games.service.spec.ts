import { ForbiddenException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { MeetAccountGamesService } from './meet-account-games.service'

describe('MeetAccountGamesService access boundaries', () => {
    it('rejects play records for a meet outside the authenticated account group', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [] })
        const createMeetAccountGame = jest.fn()
        const service = new MeetAccountGamesService({ getMeetByIdForAccount, createMeetAccountGame } as unknown as DatabaseService)

        await expect(service.createMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(createMeetAccountGame).not.toHaveBeenCalled()
    })

    it('checks group membership before deleting a play record', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [] })
        const deleteMeetAccountGame = jest.fn()
        const service = new MeetAccountGamesService({ getMeetByIdForAccount, deleteMeetAccountGame } as unknown as DatabaseService)

        await expect(service.deleteMeetAccountGameForAccount(8, 12, 21)).rejects.toThrow(ForbiddenException)
        expect(deleteMeetAccountGame).not.toHaveBeenCalled()
    })
})
