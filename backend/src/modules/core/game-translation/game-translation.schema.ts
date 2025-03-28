import { z } from 'zod'

export const gameTranslationSchema = z.object({
    id: z.number(),
    gameId: z.number(),
    languageCode: z.string(),
    title: z.string(),
    normalizedTitle: z.string(),
})

export const gameTranslationsSchema = z.array(gameTranslationSchema)
