import { z } from 'zod'

export const tagCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
})

export const tagCategoriesSchema = z.array(tagCategorySchema)
