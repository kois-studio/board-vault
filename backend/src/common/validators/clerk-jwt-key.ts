const PEM_PUBLIC_KEY = /^-----BEGIN PUBLIC KEY-----\s+[A-Za-z0-9+/=\s]+\s+-----END PUBLIC KEY-----$/

/**
 * The Clerk instance's JWT public key (`CLERK_JWT_KEY`), ready for `verifyToken`, or undefined when
 * it is not set. Hosting dashboards often keep a multi-line value on one line with `\n` written
 * out, so those become real line breaks: Clerk only removes real ones before reading the key.
 */
export function readClerkJwtKey(value: string | undefined): string | undefined {
    const key = value?.replace(/\\n/g, '\n').replace(/\r\n?/g, '\n').trim()

    return key || undefined
}

/** True when the key is a PEM public key, the form the Clerk Dashboard shows under API keys. */
export function isClerkJwtKey(key: string): boolean {
    return PEM_PUBLIC_KEY.test(key)
}
