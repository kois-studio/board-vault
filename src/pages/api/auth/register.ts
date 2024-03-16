import type { APIRoute } from 'astro'
import { db, Account } from 'astro:db'
import bcrypt from 'bcryptjs'

export const POST: APIRoute = async ({ request, redirect }) => {
    const formData = await request.formData()
    const email = formData.get('email')?.toString()
    const password = formData.get('password')?.toString()

    if (!email || !password) {
        return new Response('Email and password are required', { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 14)

     // Insert the new user into the DB
     try {
        await db.insert(Account).values({
            email,
            password: hashedPassword,
        });

        return redirect('/signin');
    } catch (error: any) {
        return new Response(error?.message, { status: 500 });
    }
}
