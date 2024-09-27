import { z } from 'zod'

export const UserSchema = z.object({
    name: z.string(), // unique key
    imageUrl: z.string(),
    gamesOwned: z.array(z.string()), // ref: GameDto.name owned
    gamesPlayed: z.record(  // ref: GameDto.name played
        z.object({
            lastTimePlayed: z.number(),
            rating: z.number(),
        })
    ),
})

export type UserType = z.infer<typeof UserSchema>
