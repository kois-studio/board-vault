import { z } from 'zod'

export const meetAttendeeSchema = z.object({
    meetId: z.number().int().nonnegative(),
    accountId: z.number().int().nonnegative(),
})

export const meetAttendeesSchema = z.array(meetAttendeeSchema)
