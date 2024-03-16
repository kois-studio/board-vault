import { sql } from '@astrojs/db/runtime'
import { db, Session } from 'astro:db'

// This is a utility function to validate sessions on protected routes
export async function validateSession(cookies: any) {
    const sessionId = cookies.get('session_id')
    if (!sessionId) {
        return false
    }

    const sessions = await db
        .select()
        .from(Session)
        .where(sql`${Session.sessionId} = ${sessionId}`)
        .execute()
    return sessions.length > 0
}
