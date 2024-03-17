import type { APIRoute } from 'astro'
import { db, Account, Session } from 'astro:db'
import { sql } from '@astrojs/db/runtime'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export const POST: APIRoute = async ({ request, cookies }) => {
    const { email, password } = await request.json()

    if (!email || !password) {
        return new Response(JSON.stringify({
            error: 'Email and password are required',
        }), { status: 400 })
    }

    // Fetch user from database
    const users = await db.select().from(Account).where(sql`email = ${email}`).execute()
    const user = users[0]

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return new Response(JSON.stringify({
            error: 'Invalid email or password',
        }), { status: 401 })
    }

    // Create a new session
    const sessionId = uuidv4()
    await db
        .insert(Session)
        .values({
            sessionId,
            accountId: user.id,
        })
        .execute()

    // Set the session ID in cookies
    cookies.set('session_id', sessionId, { path: '/', httpOnly: true })

    return new Response(JSON.stringify({
        message: 'Logged in successfully',
    }), { status: 200 })
}
