import { MeetAttendeesController } from './meet-attendees.controller.js'
import { MeetAttendeesService } from './meet-attendees.service.js'

describe('MeetAttendeesController actor identity', () => {
    it('passes the authenticated account as actor and keeps the route account as target', async () => {
        const createMeetAttendee = vi.fn().mockResolvedValue({ meetId: 12, accountId: 21 })
        const controller = new MeetAttendeesController({ createMeetAttendee } as unknown as MeetAttendeesService)

        await controller.createMeetAttendee({ user: { userId: 7 } }, 12, 21)

        expect(createMeetAttendee).toHaveBeenCalledWith(7, 12, 21)
    })
})
