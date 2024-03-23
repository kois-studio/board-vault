import type { APIRoute } from 'astro'
import { db, Account } from 'astro:db'
import bcrypt from 'bcryptjs'
import { validateEmail } from '../../../utils'
import { Log } from '../../../utils'
import { sql } from '@astrojs/db/runtime'

export const POST: APIRoute = async ({ request }) => {
    const { email, password, confirmPassword } = await request.json()

    Log('Register: ', { email })

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

    // Insert the new user into the DB
    try {
        const accounts = await db
            .select()
            .from(Account)
            .where(sql`email = ${email}`)

        if (accounts.length > 0) {
            return new Response(JSON.stringify({
                error: 'Email already in use! Login instead.',
            }), { status: 400 })
        }

        await db.insert(Account).values({
            email,
            password: hashedPassword,
        })

        const accounts_check = await db.select().from(Account)
        Log('Accounts on DB:', accounts_check)

        return new Response(JSON.stringify({
            message: 'Registration successful!',
        }), { status: 200 })
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: error?.message,
        }), { status: 500 })
    }
}
