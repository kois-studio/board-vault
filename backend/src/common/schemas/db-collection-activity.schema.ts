import { z } from 'zod'

export const actionTypeEnum = z.enum(['added', 'rated', 'wishlisted', 'unwishlisted', 'updated', 'removed'])

export const collectionActivitySchema = z.object({
    id: z.number().int().nonnegative(),
    accountId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
    actionType: actionTypeEnum,
    actionDetails: z
        .object({
            rating: z.number().int().nonnegative().nullable(),
        })
        .nullable(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const collectionActivitiesSchema = z.array(collectionActivitySchema)
