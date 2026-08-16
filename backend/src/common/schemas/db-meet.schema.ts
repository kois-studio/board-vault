import { z } from 'zod'

export const meetSchema = z.object({
    id: z.number().int().nonnegative(),
    groupId: z.number().int().nonnegative(),
    createdBy: z.number().int().nonnegative(),
    meetDate: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isConfirmed: z.boolean(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('completed'),
    timezone: z.string().default('UTC'),
})

export const meetsSchema = z.array(meetSchema)
