import type { UserType } from '../../api/api.types'
import type { RecommendationGroupSignal } from '../../components/recommendation-card/recommendation-card.component'

/**
 * Friday Crew: the example group the landing page samples are filled with.
 * The games are real; the covers are our own flat versions in the Board Vault style (public/images/landing), so no publisher art appears.
 */

export type ExamplePerson = { key: string; name: string; avatar: UserType['avatar'] }
export type ExampleGame = { id: string; title: string; imageUrl: string; minutes: number; minPlayers: number; maxPlayers: number }

function person(key: string, name: string, backgroundColor: string): ExamplePerson {
    return {
        key,
        name,
        avatar: { type: 'initials', initials: name.slice(0, 2).toUpperCase(), backgroundColor, iconName: null, emoji: null },
    }
}

export const EXAMPLE_GROUP = 'Friday Crew'

export const EXAMPLE_PEOPLE: Array<ExamplePerson> = [
    person('ana', 'Ana', '#8A2C7A'),
    person('leo', 'Leo', '#0E7490'),
    person('sam', 'Sam', '#B45309'),
    person('mia', 'Mia', '#047857'),
    person('jon', 'Jon', '#1D4ED8'),
]

const [ana, leo, sam, mia, jon] = EXAMPLE_PEOPLE as [ExamplePerson, ExamplePerson, ExamplePerson, ExamplePerson, ExamplePerson]

function game(id: string, title: string, minutes: number, minPlayers: number, maxPlayers: number): ExampleGame {
    return { id, title, imageUrl: `/images/landing/${id}.svg`, minutes, minPlayers, maxPlayers }
}

export const EXAMPLE_GAMES = {
    catan: game('catan', 'Catan', 60, 3, 4),
    carcassonne: game('carcassonne', 'Carcassonne', 35, 2, 5),
    uno: game('uno', 'UNO', 30, 2, 10),
    dobble: game('dobble', 'Dobble', 15, 2, 8),
    clank: game('clank', 'Clank!', 60, 2, 4),
    ticketToRide: game('ticket-to-ride', 'Ticket to Ride', 60, 2, 5),
    azul: game('azul', 'Azul', 45, 2, 4),
    codenames: game('codenames', 'Codenames', 15, 2, 8),
    jenga: game('jenga', 'Jenga', 20, 1, 8),
    dixit: game('dixit', 'Dixit', 30, 3, 6),
    sevenWonders: game('7-wonders', '7 Wonders', 30, 3, 7),
    scrabble: game('scrabble', 'Scrabble', 90, 2, 4),
}

const games = EXAMPLE_GAMES

/** The row of covers passing by under the hero: every game, in the order of the cover set. */
export const EXAMPLE_COVERS: Array<ExampleGame> = Object.values(games)

/** The shelf the "find" sample filters. */
export const EXAMPLE_SHELF: Array<ExampleGame> = [
    games.carcassonne,
    games.ticketToRide,
    games.sevenWonders,
    games.uno,
    games.jenga,
    games.catan,
    games.dobble,
    games.clank,
]

/** Add: the catalogue search for "c", two of them already on the shelf. */
export const EXAMPLE_SEARCH: Array<ExampleGame & { owned: boolean }> = [
    { ...games.codenames, owned: false },
    { ...games.catan, owned: true },
    { ...games.carcassonne, owned: true },
]

/** Rate: ratings out of 10, shown as five stars like the rest of the app. */
export const EXAMPLE_RATINGS: Array<{ game: ExampleGame; rating: number; plays: number }> = [
    { game: games.carcassonne, rating: 10, plays: 7 },
    { game: games.dobble, rating: 8, plays: 12 },
    { game: games.sevenWonders, rating: 6, plays: 3 },
]

export const EXAMPLE_WISH = games.azul

/** Share: the group's games with the people who own them. */
export const EXAMPLE_GROUP_SHELF: Array<ExampleGame & { owners: Array<ExamplePerson> }> = [
    { ...games.carcassonne, owners: [ana, mia] },
    { ...games.dixit, owners: [leo] },
    { ...games.scrabble, owners: [sam, jon] },
    { ...games.catan, owners: [mia] },
]

export type ExampleRecommendation = {
    game: ExampleGame
    score: number
    historyLabel: string
    reasons: Array<string>
    signal: RecommendationGroupSignal | null
}

/** What fits the five coming tonight, for two hours. */
export const EXAMPLE_RECOMMENDATION: ExampleRecommendation = {
    game: games.carcassonne,
    score: 92,
    historyLabel: 'Last played 6 weeks ago',
    reasons: ['Fits all 5 coming', 'Ana and Mia rated it 9', 'Fits in your 2 hours'],
    signal: { interestedCount: 3, interestedNames: 'Leo, Sam, Jon', notForUsCount: 0 },
}

/** Plan: next Friday's game night, and what the crew played last Friday. */
export const EXAMPLE_NIGHT: {
    weekday: string
    day: string
    title: string
    meta: string
    rsvps: Array<{ person: ExamplePerson; answer: 'going' | 'not-going' | 'no-answer' }>
    lastNight: Array<{ game: ExampleGame; winner: string }>
} = {
    weekday: 'Fri',
    day: '16',
    title: 'Game night at Mia’s',
    meta: '19:30 · in 4 days',
    rsvps: [
        { person: ana, answer: 'going' },
        { person: mia, answer: 'going' },
        { person: sam, answer: 'going' },
        { person: leo, answer: 'no-answer' },
        { person: jon, answer: 'not-going' },
    ],
    lastNight: [
        { game: games.jenga, winner: 'Leo' },
        { game: games.sevenWonders, winner: 'Mia' },
        { game: games.clank, winner: 'Ana' },
    ],
}
