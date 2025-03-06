import { z } from 'zod'

export const tagSchema = z.object({
    tag: z.string(),
    category: z.string(),
})

export const tagsSchema = z.array(tagSchema)
