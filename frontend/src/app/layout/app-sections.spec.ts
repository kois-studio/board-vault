import { activeSectionFor, isUrlWithin } from './app-sections'

describe('app sections', () => {
    it.each([
        ['/dashboard', 'Home'],
        ['/groups/7/sessions/new', 'Home'],
        ['/collection/browse?players=4', 'Collection'],
        ['/games/12', 'Collection'],
        ['/play/history', 'Play'],
        ['/sessions/3', 'Play'],
    ])('puts %s under %s', (url, name) => {
        expect(activeSectionFor(url)?.name).toBe(name)
    })

    it('leaves pages outside the sections without one', () => {
        expect(activeSectionFor('/settings/profile')).toBeNull()
        expect(activeSectionFor('/playlists')).toBeNull()
    })

    it('matches whole path segments only', () => {
        expect(isUrlWithin('/collection/games/4', '/collection/games')).toBe(true)
        expect(isUrlWithin('/collection/gamesx', '/collection/games')).toBe(false)
    })
})
