import type { Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { SkeletonGroupPageComponent } from './skeleton-group-page/skeleton-group-page.component'
import { SkeletonPlayedGamesComponent } from './skeleton-played-games/skeleton-played-games.component'
import { SkeletonSessionActionsComponent } from './skeleton-session-actions/skeleton-session-actions.component'
import { SkeletonSessionBodyComponent } from './skeleton-session-body/skeleton-session-body.component'
import { SkeletonSessionPageComponent } from './skeleton-session-page/skeleton-session-page.component'

const PULSE = 'motion-safe:animate-pulse'

/** The page skeletons of #260: in the shape of what they stand for, and pulsing once, never one layer over another. */
describe('page skeletons (#260)', () => {
    const create = <T>(type: Type<T>, inputs: Record<string, unknown> = {}) => {
        const fixture = TestBed.createComponent(type)
        for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)
        fixture.detectChanges()
        return fixture.nativeElement as HTMLElement
    }
    const pulsing = (element: HTMLElement) => [element, ...element.querySelectorAll('*')].filter((node) => node.classList.contains(PULSE))

    it('gives the played games one card each, up to four, and an empty box for none', () => {
        expect(create(SkeletonPlayedGamesComponent, { count: 2 }).querySelectorAll('li')).toHaveLength(2)
        expect(create(SkeletonPlayedGamesComponent, { count: 9 }).querySelectorAll('li')).toHaveLength(4)
        const none = create(SkeletonPlayedGamesComponent, { count: 0 })
        expect(none.querySelectorAll('li')).toHaveLength(0)
        expect(none.querySelector('.border-dashed')).not.toBeNull()
        // "Mark a game as played" for someone running the night.
        expect(create(SkeletonPlayedGamesComponent, { count: 1 }).querySelector('.mt-6')).toBeNull()
        expect(create(SkeletonPlayedGamesComponent, { count: 1, markable: true }).querySelectorAll('.mt-6 .grid > div')).toHaveLength(2)
    })

    it('shapes a game night’s body from what the night already says', () => {
        const planned = create(SkeletonSessionBodyComponent, { played: null, shortlisted: 2, people: 9 })
        expect(planned.querySelector('[data-testid="played-games-skeleton"]')).toBeNull()
        expect(planned.querySelectorAll('[data-testid="shortlist-skeleton"] li')).toHaveLength(2)
        expect(planned.querySelectorAll('[data-testid="people-skeleton"] li')).toHaveLength(6)

        const played = create(SkeletonSessionBodyComponent, { played: 3, shortlisted: 0, scheduled: false, people: 0 })
        expect(played.querySelectorAll('[data-testid="played-games-skeleton"] li')).toHaveLength(3)
        expect(played.querySelector('[data-testid="shortlist-skeleton"] .border-dashed')).not.toBeNull()
        expect(played.querySelectorAll('[data-testid="people-skeleton"] li')).toHaveLength(1)
    })

    it('holds the place of the answer and the buttons only when they are likely to show', () => {
        expect(create(SkeletonSessionActionsComponent).children).toHaveLength(0)
        expect(create(SkeletonSessionActionsComponent, { rsvp: true }).children).toHaveLength(1)
        expect(create(SkeletonSessionActionsComponent, { rsvp: true, actions: true }).children).toHaveLength(2)
        expect(create(SkeletonSessionActionsComponent, { actions: true, hint: true }).children).toHaveLength(2)
        // The line under the buttons comes only with the buttons.
        expect(create(SkeletonSessionActionsComponent, { hint: true }).children).toHaveLength(0)
    })

    it('pulses once on its own, and not at all inside another skeleton', () => {
        const alone = create(SkeletonPlayedGamesComponent, { count: 1 })
        expect(alone.classList.contains(PULSE)).toBe(true)
        expect(create(SkeletonPlayedGamesComponent, { count: 1, nested: true }).classList.contains(PULSE)).toBe(false)
        expect(alone.getAttribute('aria-hidden')).toBe('true')

        for (const page of [create(SkeletonSessionPageComponent), create(SkeletonGroupPageComponent)]) {
            expect(pulsing(page)).toEqual([page])
        }
    })
})
