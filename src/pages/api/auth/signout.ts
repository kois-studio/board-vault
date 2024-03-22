import type { APIRoute } from 'astro'
import { Session, db } from 'astro:db'
import { sql } from '@astrojs/db/runtime'

export const GET: APIRoute = async ({ cookies, redirect }) => {
    // Retrieve the session ID from cookies
    const sessionId = cookies.get('session_id')

    if (sessionId) {
        console.log('BBBBBBBBBBBBBB')
        // Invalidate the session in the database
        await db
            .delete(Session)
            .where(sql`sessionId = ${sessionId}`)
            console.log('CCCCCCCCCCCCCC')

        // Clear the session cookie
        cookies.delete('session_id', { path: '/' })
        console.log('DDDDDDDDDDDDD')

    }

    return redirect('/')
}
