import { z } from 'zod'

export const gameTagSchema = z.object({
    gameId: z.number(),
    tagId: z.number(),
})

export const gameTagsSchema = z.array(gameTagSchema)
export type GameTagType = z.infer<typeof gameTagSchema>
