import { z } from 'zod'

export const gameTranslationSchema = z.object({
    gameId: z.number(),
    languageCode: z.enum(['en', 'es']),
    title: z.string(),
    normalizedTitle: z.string(),
})

export const gameTranslationsSchema = z.array(gameTranslationSchema)
