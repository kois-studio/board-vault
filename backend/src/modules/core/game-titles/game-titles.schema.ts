import { z } from 'zod'

/** One edition's title, as `GameTitlesService` reads it from `GameEdition`. */
export const editionTitleSchema = z.object({
    gameId: z.number(),
    languageCode: z.string(),
    title: z.string(),
    normalizedTitle: z.string(),
})

export const editionTitlesSchema = z.array(editionTitleSchema)

export type EditionTitle = z.infer<typeof editionTitleSchema>
