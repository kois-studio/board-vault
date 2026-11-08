import { ExecutionContext, ForbiddenException } from '@nestjs/common'

import { fakeActivityNotifier } from '../../../test/fake-activity-notifier.js'
import { fakeDatabase } from '../../../test/fake-database.js'
import { GroupMembershipsService } from '../../modules/core/group-memberships/group-memberships.service.js'
import { ApiErrorFilter } from '../http/api-error.filter.js'
import { ProviderTimeoutError } from '../http/provider-timeout.js'

import { UserInGroupGuard } from './user-in-group.guard.js'

const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext

describe('UserInGroupGuard', () => {
    it('accepts a group ID from an invitation request body', async () => {
        const getSafeGroupMembershipById = vi.fn().mockResolvedValue({ accountId: 7, groupId: 12 })
        const guard = new UserInGroupGuard({ getSafeGroupMembershipById } as unknown as GroupMembershipsService)

        await expect(guard.canActivate(createContext({ user: { userId: 7 }, params: {}, body: { groupId: 12 } }))).resolves.toBe(true)
        expect(getSafeGroupMembershipById).toHaveBeenCalledWith(7, 12)
    })

    it('denies a user who is not a member of the group', async () => {
        const getSafeGroupMembershipById = vi.fn().mockResolvedValue(null)
        const guard = new UserInGroupGuard({ getSafeGroupMembershipById } as unknown as GroupMembershipsService)

        await expect(guard.canActivate(createContext({ user: { userId: 7 }, params: {}, body: { groupId: 12 } }))).rejects.toThrow(
            ForbiddenException,
        )
    })
})

/** The guard with the real membership service over a stubbed database, its errors answered by ApiErrorFilter (#245). */
describe('UserInGroupGuard when the membership lookup fails (#245)', () => {
    const answer = async (getGroupMembershipById: ReturnType<typeof vi.fn>) => {
        const service = new GroupMembershipsService(fakeDatabase({ getGroupMembershipById }), fakeActivityNotifier())
        const guard = new UserInGroupGuard(service)
        const response = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() }
        const host = {
            switchToHttp: () => ({ getRequest: () => ({ method: 'GET', originalUrl: '/groups/12/people' }), getResponse: () => response }),
        }

        try {
            const allowed = await guard.canActivate(createContext({ user: { userId: 7 }, params: { groupId: '12' } }))

            return { allowed }
        } catch (error) {
            new ApiErrorFilter().catch(error, host as never)
            return { error, body: response.json.mock.calls[0]![0] as { statusCode: number; code: string; message: string } }
        }
    }

    it('answers 503 DATABASE_TIMEOUT, not 403, when the membership query times out', async () => {
        const result = await answer(vi.fn().mockRejectedValue(new ProviderTimeoutError('database')))

        expect(result.error).toBeInstanceOf(ProviderTimeoutError)
        expect(result.body).toMatchObject({ statusCode: 503, code: 'DATABASE_TIMEOUT' })
    })

    it('answers 500, not 403, when the membership query fails another way', async () => {
        const result = await answer(vi.fn().mockRejectedValue(new Error('SQLITE_BUSY')))

        expect(result.error).not.toBeInstanceOf(ForbiddenException)
        expect(result.body).toMatchObject({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Request failed' })
    })

    it('still answers 403 with its own message when the account has no membership', async () => {
        const result = await answer(vi.fn().mockResolvedValue({ rows: [] }))

        expect(result.error).toBeInstanceOf(ForbiddenException)
        expect(result.body).toMatchObject({
            statusCode: 403,
            message: 'You are not a member of this group and do not have permission to access this information',
        })
    })

    it('lets a member in', async () => {
        const getGroupMembershipById = vi.fn().mockResolvedValue({ rows: [[7, 12, '2026-01-01 10:00:00']] })

        await expect(answer(getGroupMembershipById)).resolves.toEqual({ allowed: true })
        expect(getGroupMembershipById).toHaveBeenCalledWith(7, 12)
    })
})
