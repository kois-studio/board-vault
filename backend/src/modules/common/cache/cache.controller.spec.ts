import { GUARDS_METADATA } from '@nestjs/common/constants'

import { AdminGuard } from '../../../common/guards/admin.guard'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'

import { CacheController } from './cache.controller'
import { CacheService } from './cache.service'

describe('CacheController', () => {
    it('protects operational cache endpoints with authenticated admin access', () => {
        const guards = Reflect.getMetadata(GUARDS_METADATA, CacheController) as Array<unknown>

        expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, AdminGuard]))
    })

    it('delegates cache operations without exposing provider details in the controller', async () => {
        const cacheService = {
            keys: jest.fn().mockResolvedValue({ keys: ['user-proposal-stats:1'] }),
            deleteAll: jest.fn().mockResolvedValue(true),
            deleteOne: jest.fn().mockResolvedValue(true),
        }
        const controller = new CacheController(cacheService as unknown as CacheService)

        await expect(controller.printAll()).resolves.toEqual({ keys: ['user-proposal-stats:1'] })
        await expect(controller.reset()).resolves.toBe(true)
        await expect(controller.delete('user-proposal-stats:1')).resolves.toBe(true)
        expect(cacheService.keys).toHaveBeenCalledTimes(1)
        expect(cacheService.deleteAll).toHaveBeenCalledTimes(1)
        expect(cacheService.deleteOne).toHaveBeenCalledWith('user-proposal-stats:1')
    })
})
