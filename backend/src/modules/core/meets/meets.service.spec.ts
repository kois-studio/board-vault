import { NotFoundException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { MeetsService } from './meets.service'

const meetRows = [[12, 5, 7, '2026-08-15 00:00:00', 0]]
const currentMeetRows = [[12, 5, 7, '2026-08-15 00:00:00', 0, 'scheduled', 'Europe/Madrid', 'Bring the new game']]

describe('MeetsService access boundaries', () => {
    it('forwards the authenticated account to meet lookup', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: meetRows })
        const service = new MeetsService(fakeDatabase({ getMeetByIdForAccount }))

        await expect(service.getMeetById(12, 7)).resolves.toMatchObject({ id: 12, groupId: 5, createdBy: 7 })
        expect(getMeetByIdForAccount).toHaveBeenCalledWith(12, 7)
    })

    it('does not disclose a meet outside the authenticated account group', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: [] })
        const service = new MeetsService(fakeDatabase({ getMeetByIdForAccount }))

        await expect(service.getMeetById(12, 8)).rejects.toThrow(NotFoundException)
    })

    it('maps notes from the explicit current meet projection', async () => {
        const getMeetByIdForAccount = jest.fn().mockResolvedValue({ rows: currentMeetRows })
        const service = new MeetsService(fakeDatabase({ getMeetByIdForAccount }))

        await expect(service.getMeetById(12, 7)).resolves.toMatchObject({
            status: 'scheduled',
            timezone: 'Europe/Madrid',
            notes: 'Bring the new game',
        })
    })

    it('maps group history notes from the explicit current meet projection', async () => {
        const getMeetsByGroupId = jest.fn().mockResolvedValue({ rows: currentMeetRows })
        const service = new MeetsService(fakeDatabase({ getMeetsByGroupId }))

        await expect(service.getMeetsByGroupId(5)).resolves.toEqual([
            expect.objectContaining({ status: 'scheduled', timezone: 'Europe/Madrid', notes: 'Bring the new game' }),
        ])
        expect(getMeetsByGroupId).toHaveBeenCalledWith(5)
    })
})
