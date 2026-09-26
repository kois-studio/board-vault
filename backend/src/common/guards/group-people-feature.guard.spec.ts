import { NotFoundException } from '@nestjs/common'

import { GroupPeopleFeatureGuard } from './group-people-feature.guard'

describe('GroupPeopleFeatureGuard', () => {
    const previousValue = process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED

    afterEach(() => {
        if (previousValue === undefined) delete process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED
        else process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED = previousValue
    })

    it('keeps the participant surface enabled by default', () => {
        delete process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED
        expect(new GroupPeopleFeatureGuard().canActivate({} as never)).toBe(true)
    })

    it('fails closed when the rollout kill switch is enabled', () => {
        process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED = 'false'
        expect(() => new GroupPeopleFeatureGuard().canActivate({} as never)).toThrow(NotFoundException)
    })
})
