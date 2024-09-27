import type { APIRoute } from 'astro'
import { db, Account, eq } from 'astro:db'
import bcrypt from 'bcryptjs'
import { validateEmail } from '../../../utils'
import { Log } from '../../../utils'

export const POST: APIRoute = async ({ request }) => {
    const { alias, email, password, confirmPassword } = await request.json()

    Log('Register: ', { email })

    if (!alias || !email || !password || !confirmPassword) {
        return new Response(JSON.stringify({
            error: 'Please fill all the required fields',
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
            .where(eq(Account.email, email))

        if (accounts.length > 0) {
            return new Response(JSON.stringify({
                error: 'Email already in use! Login instead.',
            }), { status: 400 })
        }

        await db.insert(Account).values({
            email,
            alias,
            imageUrl: '',
            password: hashedPassword,
        })

        const accounts_check = await db.select().from(Account)
        Log('Accounts on DB:', accounts_check)

        return new Response(JSON.stringify({
            message: 'Registration successful!',
        }), { status: 200 })
    } catch (error: any) {
        Log('Error: ', error.message)

        if (error?.message === 'SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: Account.alias') {
            return new Response(JSON.stringify({
                error: 'Alias already in use! Please choose another one.',
            }), { status: 400 })
        }

        return new Response(JSON.stringify({
            error: 'An error occurred while registering the user. Please try again later.'
        }), { status: 500 })
    }
}
