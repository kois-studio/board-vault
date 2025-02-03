import { z } from 'zod'

export const meetSchema = z.object({
    id: z.number().int().nonnegative(),
    groupId: z.number().int().nonnegative(),
    createdBy: z.number().int().nonnegative(),
    meetDate: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isConfirmed: z.boolean(),
})

export const meetsSchema = z.array(meetSchema)
