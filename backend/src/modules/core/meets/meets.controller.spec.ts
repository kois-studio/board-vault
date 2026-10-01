import { MeetsController } from './meets.controller'
import { MeetsService } from './meets.service'

describe('MeetsController access identity', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy meet list to the authenticated account', async () => {
        const getMeetsForAccount = vi.fn().mockResolvedValue([])
        const controller = new MeetsController({ getMeetsForAccount } as unknown as MeetsService)

        await controller.getMeets(request)

        expect(getMeetsForAccount).toHaveBeenCalledWith(7)
    })

    it('passes the authenticated account to meet reads', async () => {
        const getMeetById = vi.fn().mockResolvedValue({})
        const getMeetDetailsById = vi.fn().mockResolvedValue({})
        const controller = new MeetsController({ getMeetById, getMeetDetailsById } as unknown as MeetsService)

        await controller.getMeetById(request, 12)
        await controller.getMeetDetailsById(request, 12)

        expect(getMeetById).toHaveBeenCalledWith(12, 7)
        expect(getMeetDetailsById).toHaveBeenCalledWith(12, 7)
    })
})
