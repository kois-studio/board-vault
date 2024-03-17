import type { APIRoute } from 'astro'
import { db, Account } from 'astro:db'
import bcrypt from 'bcryptjs'
import { validateEmail } from '../../../utils'

export const POST: APIRoute = async ({ request, redirect }) => {
    const { email, password, confirmPassword } = await request.json()

    if (!email || !password || !confirmPassword) {
        return new Response(JSON.stringify({
            error: 'Email and password are required',
        }), { status: 400 })
    }

    if (!validateEmail(email) || email.length > 128) {
        return new Response(JSON.stringify({
            error: 'Invalid email',
        }), { status: 400 })
    }

    if (password !== confirmPassword) {
        return new Response(JSON.stringify({
            error: 'Passwords do not match',
        }), { status: 400 })
    }

    if (password.length < 4 || password.length > 48) {
        return new Response(JSON.stringify({
            error: 'Password is not valid',
        }), { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 14)

    return new Response(
        JSON.stringify({
            email,
            password: hashedPassword,
        }),
        { status: 501 },
    )

    // Insert the new user into the DB
    try {
        await db.insert(Account).values({
            email,
            password: hashedPassword,
        })

        return redirect('/login')
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: error?.message,
        }), { status: 500 })
    }
}
