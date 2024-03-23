import { sql } from '@astrojs/db/runtime'
import type { APIRoute } from 'astro'
import { Session, db } from 'astro:db'

export const GET: APIRoute = async ({ cookies }) => {
    const sessionId = cookies.get('session_id')

    if (sessionId) {
        const sessions = await db
            .select()
            .from(Session)
            .where(sql`sessionId = ${sessionId}`)
            .execute()

        if (sessions.length > 0) {
            // The session is valid
            return new Response(JSON.stringify({ valid: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        }
    }

    // The session is not valid
    return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}
