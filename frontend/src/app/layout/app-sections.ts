export type AppSection = {
    path: string
    name: string
    icon: string
    /** URL prefixes that belong to this section (besides its own path). */
    owns: Array<string>
    subsections?: Array<{ path: string; icon: string; name: string }>
}

/** The three main sections: in the header on desktop and the bottom tab bar on phones. */
export const APP_SECTIONS: Array<AppSection> = [
    {
        path: '/dashboard',
        name: 'Home',
        icon: 'home',
        // Groups and everything inside them live under Home.
        owns: ['/groups'],
    },
    {
        path: '/collection',
        name: 'Collection',
        icon: 'library',
        owns: ['/games'],
        subsections: [
            { path: '/collection/games', icon: 'collection-fill', name: 'My Games' },
            { path: '/collection/browse', icon: 'search', name: 'Browse' },
            { path: '/collection/reviews', icon: 'star-fill', name: 'Reviews' },
            { path: '/collection/wishlist', icon: 'suit-heart-fill', name: 'Wishlist' },
        ],
    },
    {
        path: '/play',
        name: 'Play',
        icon: 'dice',
        owns: ['/sessions', '/meets'],
        subsections: [
            { path: '/play/upcoming-sessions', icon: 'calendar-clock', name: 'Upcoming' },
            { path: '/play/recommendations', icon: 'lightbulb', name: 'What to play' },
            { path: '/play/history', icon: 'history', name: 'History' },
        ],
    },
]

function pathOf(url: string): string {
    return url.split(/[?#]/)[0] ?? ''
}

/** True when `url` is `prefix` or below it. */
export function isUrlWithin(url: string, prefix: string): boolean {
    const path = pathOf(url)
    return path === prefix || path.startsWith(`${prefix}/`)
}

export function activeSectionFor(url: string): AppSection | null {
    return APP_SECTIONS.find((section) => isUrlWithin(url, section.path) || section.owns.some((prefix) => isUrlWithin(url, prefix))) ?? null
}
