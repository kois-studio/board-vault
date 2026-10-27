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
        name: $localize`:Main section of the app, with your groups:Home`,
        icon: 'home',
        // Groups and everything inside them live under Home.
        owns: ['/groups'],
    },
    {
        path: '/collection',
        name: $localize`:Main section of the app, with your games:Collection`,
        icon: 'library',
        owns: ['/games'],
        subsections: [
            { path: '/collection/games', icon: 'collection-fill', name: $localize`:Tab in Collection, the games you own:My Games` },
            { path: '/collection/browse', icon: 'search', name: $localize`:Tab in Collection, the game catalogue:Browse` },
            { path: '/collection/reviews', icon: 'star-fill', name: $localize`:Tab in Collection, your ratings and reviews:Reviews` },
            { path: '/collection/wishlist', icon: 'suit-heart-fill', name: $localize`:Tab in Collection, games you want:Wishlist` },
        ],
    },
    {
        path: '/play',
        name: $localize`:Main section of the app, with game nights:Play`,
        icon: 'dice',
        owns: ['/sessions', '/meets'],
        subsections: [
            { path: '/play/upcoming-sessions', icon: 'calendar-clock', name: $localize`:Tab in Play, the planned game nights:Upcoming` },
            { path: '/play/recommendations', icon: 'lightbulb', name: $localize`:Tab in Play, game suggestions for a group:What to play` },
            { path: '/play/history', icon: 'history', name: $localize`:Tab in Play, the game nights already played:History` },
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
