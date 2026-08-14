import { MeetAccountGamesController } from './meet-account-games.controller'
import { MeetAccountGamesService } from './meet-account-games.service'

describe('MeetAccountGamesController actor identity', () => {
    it('derives the played-by account from the authenticated user', async () => {
        const createMeetAccountGameForAccount = jest.fn().mockResolvedValue({})
        const controller = new MeetAccountGamesController({ createMeetAccountGameForAccount } as unknown as MeetAccountGamesService)

        await controller.createMeetAccountGame({ user: { userId: 7 } }, 12, 21)

        expect(createMeetAccountGameForAccount).toHaveBeenCalledWith(7, 12, 21)
    })

    it('derives the deleted played-by account from the authenticated user', async () => {
        const deleteMeetAccountGameForAccount = jest.fn().mockResolvedValue({ success: true })
        const controller = new MeetAccountGamesController({ deleteMeetAccountGameForAccount } as unknown as MeetAccountGamesService)

        await controller.updateMeetAccountGame({ user: { userId: 7 } }, 12, 21)

        expect(deleteMeetAccountGameForAccount).toHaveBeenCalledWith(7, 12, 21)
    })
})
