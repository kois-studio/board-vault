import { z } from 'zod'

export const ServerSchema = z.enum(['euw1', 'na1'])

export type ServerType = z.infer<typeof ServerSchema>
