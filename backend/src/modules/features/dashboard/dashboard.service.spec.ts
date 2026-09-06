import { DashboardService } from './dashboard.service'

describe('DashboardService group history', () => {
    it('returns completed sessions only', async () => {
        const meets = {
            getMeetsByGroupId: jest.fn().mockResolvedValue([
                {
                    id: 10,
                    groupId: 7,
                    createdBy: 1,
                    meetDate: '2026-08-10T19:30:00.000Z',
                    isConfirmed: true,
                    status: 'completed',
                    timezone: 'Europe/Madrid',
                },
                {
                    id: 11,
                    groupId: 7,
                    createdBy: 1,
                    meetDate: '2026-08-17T19:30:00.000Z',
                    isConfirmed: false,
                    status: 'scheduled',
                    timezone: 'Europe/Madrid',
                },
            ]),
        }
        const meetAccountGames = {
            getDistinctAccountIdsByMeetIdAndGameId: jest.fn().mockResolvedValue([]),
        }
        const database = {
            getMeetAttendedAccountIds: jest.fn().mockResolvedValue([]),
            getPlayedGameIdsByMeetId: jest.fn().mockResolvedValue([]),
        }

        const service = new DashboardService(
            {} as never,
            database as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            meets as never,
            {} as never,
            meetAccountGames as never,
            {} as never,
            {} as never,
        )

        await expect(service.getGroupMeetings(1, 7)).resolves.toHaveLength(1)
        expect(database.getPlayedGameIdsByMeetId).toHaveBeenCalledWith(10)
        expect(database.getPlayedGameIdsByMeetId).not.toHaveBeenCalledWith(11)
    })
})

describe('DashboardService group creation', () => {
    it('returns the created group identifier for the onboarding handoff', async () => {
        const database = {
            createGroupWithMembership: jest.fn().mockResolvedValue({ groupId: 42 }),
        }
        const service = new DashboardService(
            {} as never,
            database as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        )

        await expect(service.createGroup(7, 'Friday Crew')).resolves.toEqual({ success: true, groupId: 42 })
        expect(database.createGroupWithMembership).toHaveBeenCalledWith({ name: 'Friday Crew', createdBy: 7 })
    })
})
