import type { APIRoute } from 'astro'
import { db, Account, Session, eq } from 'astro:db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { Log } from '../../../utils'

export const POST: APIRoute = async ({ request, cookies }) => {
    const { email, password } = await request.json()

    Log('Login: ', { email })

    if (!email || !password) {
        return new Response(JSON.stringify({
            error: 'Email and password are required',
        }), { status: 400 })
    }

    // Fetch user from database
    const users = await db.select().from(Account).where(eq(Account.email, email)).execute()
    const user = users[0]

    Log({ user })

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

    if (import.meta.env) {
        const sessions = await db.select().from(Session)
        Log({ sessions })
    }

    // Set the session ID in cookies
    cookies.set('session_id', sessionId, { path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'strict' })

    return new Response(JSON.stringify({
        message: 'Logged in successfully',
    }), { status: 200 })
}
