/**
 * Test double for ClerkTokenVerifier. Install it with
 * `overrideProvider(ClerkTokenVerifier).useValue(new FakeClerkTokenVerifier())`
 * and authenticate requests with `sessionFor(clerkUserId)`.
 */
export class FakeClerkTokenVerifier {
    async verify(token: string): Promise<string | null> {
        return token.startsWith('test-session:') ? token.slice('test-session:'.length) : null
    }
}

export const sessionFor = (clerkUserId: string): string => `test-session:${clerkUserId}`
