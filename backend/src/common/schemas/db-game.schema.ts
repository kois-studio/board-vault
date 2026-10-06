import { z } from 'zod'

import { ARTWORK_PATH } from '../artwork/artwork.js'

export const gameSchema = z.object({
    id: z.number().int().nonnegative(),
    // Our own `/artwork/…` path (ADR-0015), empty for no artwork, or an address not yet copied.
    imageUrl: z.string().regex(ARTWORK_PATH).or(z.string().url()).or(z.literal('')),
    gameAvgDuration: z.number().int().nonnegative(),
    minPlayers: z.number().int().nonnegative(),
    maxPlayers: z.number().int().nonnegative(),
})

export const gamesSchema = z.array(gameSchema)
