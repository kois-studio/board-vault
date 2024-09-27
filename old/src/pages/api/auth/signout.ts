import type { APIRoute } from 'astro'
import { Session, db, eq } from 'astro:db'
import { Log } from '../../../utils'

export const GET: APIRoute = async ({ cookies }) => {
    // Retrieve the session ID from cookies
    const sessionId = cookies.get('session_id')

    if (!sessionId) {
        return new Response(JSON.stringify({
            error: 'No session found',
        }), { status: 400 })
    }

    Log('Closing Session ID:', sessionId.value)

    try {
        // Delete cookie
        cookies.delete('session_id', { path: '/' })

        // Delete session from DB
        await db
            .delete(Session)
            .where(eq(Session.sessionId, sessionId.value))
            .execute()

        return new Response(JSON.stringify({
            message: 'Logged out successfully',
        }), { status: 200 }) 
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: error.message,
        }), { status: 500 })
    }
}
