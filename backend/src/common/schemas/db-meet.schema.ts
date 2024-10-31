import { z } from 'zod'

export const meetSchema = z.object({
    id: z.number().int().nonnegative(),
    groupId: z.number().int().nonnegative(),
    createdBy: z.number().int().nonnegative(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isConfirmed: z.boolean(),
    confirmedAt: z
        .string()
        .refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
        .nullable(),
})

export const meetsSchema = z.array(meetSchema)
