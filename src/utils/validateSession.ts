import { Log } from '.'

type AccountType = {
    id: number
    email: string
    password: string
    created_at: Date
    alias: string
    imageUrl: string
}

// This is a utility function to validate sessions on protected routes
export async function validateSession(
    accessToken: string | null,
): Promise<AccountType | null> {
    Log('Access token: ', accessToken)
    if (!accessToken) {
        return null
    }

    const sessions = await db
        .select()
        .from(Session)
        .where(eq(Session.sessionId, accessToken))

    Log('Sessions: ', sessions)
    if (sessions.length === 0) {
        return null
    }

    const accounts = await db
        .select()
        .from(Account)
        .where(eq(Account.id, Number(sessions[0]?.accountId)))
    const account = accounts[0]

    Log('Accounts: ', accounts)
    if (!account) {
        throw new Error('Account not found')
    }

    return account ?? null
}
