// Vercel Routing Middleware (ADR-0024). Every page lives under its language (`/es/…`); an address
// without one (`/`, an old bookmark, the installed app's start page, Clerk's invitation link) is
// sent to the same path in the visitor's language. The matcher keeps files and prefixed pages away,
// so the middleware only ever redirects.
import { localeRedirect } from './src/app/core/i18n/locales'

export const config = {
    matcher: ['/((?!(?:en|es|fr|de|it)(?:/|$))(?!.*\\.[A-Za-z0-9]+$).*)'],
}

export default function middleware(request: Request): Response {
    const url = new URL(request.url)
    const location = localeRedirect(url, request.headers.get('cookie'), request.headers.get('accept-language')) ?? '/en/'

    return new Response(null, {
        status: 307,
        headers: { Location: location, 'Cache-Control': 'private, no-store', Vary: 'Cookie, Accept-Language' },
    })
}
