import { z } from 'zod'

export const actionTypeEnum = z.enum(['added', 'rated', 'wishlisted', 'unwishlisted', 'updated', 'removed'])

export const collectionActivitySchema = z.object({
    id: z.number().int().nonnegative(),
    accountId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
    actionType: actionTypeEnum,
    actionDetails: z
        .string()
        .nullable()
        .transform(val => {
            if (!val) return null
            try {
                return JSON.parse(val)
            } catch {
                return null
            }
        })
        .pipe(z.record(z.any()).nullable()),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const collectionActivitiesSchema = z.array(collectionActivitySchema)
