import { z } from 'zod'

export const gameProposalSchema = z.object({
    id: z.number().int().nonnegative(),
    submittedBy: z.number().int().nonnegative(),
    status: z.enum(['pending', 'approved', 'rejected', 'duplicate']),
    title: z.string(),
    imageUrl: z.string().nullable(),
    gameAvgDuration: z.number().int().nonnegative().nullable(),
    minPlayers: z.number().int().nonnegative().nullable(),
    maxPlayers: z.number().int().nonnegative().nullable(),
    proposedTags: z.string().nullable(), // JSON text
    notes: z.string().nullable(),
    reviewedBy: z.number().int().nonnegative().nullable(),
    reviewedAt: z.string().nullable().refine(
        (date) => !date || !isNaN(Date.parse(date)), 
        { message: 'Invalid date format' }
    ),
    reviewNotes: z.string().nullable(),
    createdGameId: z.number().int().nonnegative().nullable(),
    submittedAt: z.string().refine(
        (date) => !isNaN(Date.parse(date)), 
        { message: 'Invalid date format' }
    ),
})

export const gameProposalsSchema = z.array(gameProposalSchema) 
