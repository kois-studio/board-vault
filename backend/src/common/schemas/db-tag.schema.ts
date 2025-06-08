import { z } from 'zod'

export const tagSchema = z.object({
    id: z.number(),
    name: z.string(),
    categoryId: z.number(),
})

export const tagsSchema = z.array(tagSchema)
