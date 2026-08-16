import { z } from 'zod'

import type { GameCompleteType, MeetType, MeetWithAttendeesAndGamesType, RecommendationsType, ScheduledSessionCreatedType, SessionCreatedType, SessionStatusUpdatedType } from './api.types'

const gameCompleteSchema: z.ZodType<GameCompleteType> = z.object({
    id: z.number(),
    title: z.string(),
    imageUrl: z.string(),
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    titleTranslations: z.object({
        en: z.string(),
        es: z.string(),
    }),
})

const meetFields = z.object({
    id: z.number(),
    groupId: z.number(),
    createdBy: z.number(),
    meetDate: z.string(),
    isConfirmed: z.boolean(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
    timezone: z.string(),
})

export const meetSchema: z.ZodType<MeetType> = meetFields

export const meetDetailsSchema: z.ZodType<MeetWithAttendeesAndGamesType> = meetFields.extend({
    attendees: z.array(z.number()),
    playedGames: z.array(z.number()),
    plannedGames: z.array(z.number()),
    skippedGames: z.array(z.number()),
})

export const sessionCreatedSchema: z.ZodType<SessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('completed'),
})

export const scheduledSessionCreatedSchema: z.ZodType<ScheduledSessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('scheduled'),
})

export const sessionStatusUpdatedSchema: z.ZodType<SessionStatusUpdatedType> = z.object({
    sessionId: z.number(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
})

export const recommendationsSchema: z.ZodType<RecommendationsType> = z.object({
    groupId: z.number(),
    attendeeIds: z.array(z.number()),
    availableMinutes: z.number().nullable(),
    recommendations: z.array(z.object({
        gameData: gameCompleteSchema,
        score: z.number(),
        explanation: z.object({
            reasons: z.array(z.string()),
            attendeeOwnerCount: z.number(),
            attendeeCount: z.number(),
            averageReview: z.number().nullable(),
            lastPlayedAt: z.string().nullable(),
        }),
    })),
    noResultReason: z.string().nullable(),
})

export const successSchema = z.object({ success: z.literal(true) })
