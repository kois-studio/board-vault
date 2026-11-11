import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { ResourceStatus } from '../../../core/async/resource-state'
import { withStates } from '../../../core/async/resource-state.testing'
import { DataService } from '../../../core/services/data.service'
import { ReviewsPageComponent } from './reviews-page.component'

const game = (id: number, title: string) => ({ id, titleTranslations: { en: title, es: title }, imageUrl: '' })

describe('ReviewsPageComponent, the games waiting for your rating (#256)', () => {
    const render = async (statuses: { groups?: ResourceStatus; reviews?: ResourceStatus } = {}) => {
        const refreshUserGroups = vi.fn()
        await TestBed.configureTestingModule({
            imports: [ReviewsPageComponent],
            providers: [
                provideRouter([]),
                {
                    provide: DataService,
                    useValue: withStates(
                        {
                            currentUser: signal({ id: 1 }),
                            userGroups: signal(
                                statuses.groups === 'loading' || statuses.groups === 'error'
                                    ? []
                                    : [{ id: 7, name: 'Fridays', members: [{ id: 2, games: [game(1, 'Azul'), game(2, 'Root')] }] }],
                            ),
                            // Nothing has loaded while it is loading: the list is still the initial empty one.
                            userReviews: signal(
                                statuses.reviews === 'loading'
                                    ? []
                                    : [{ accountId: 1, gameId: 2, review: 8, reviewDate: '', gameData: game(2, 'Root') }],
                            ),
                            refreshUserGroups,
                            refreshGameReviews: vi.fn(),
                            saveReview: vi.fn(),
                        },
                        { userGroups: statuses.groups ?? 'ready', userReviews: statuses.reviews ?? 'ready' },
                    ),
                },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(ReviewsPageComponent)
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, refreshUserGroups }
    }
    const waiting = (element: HTMLElement) => element.querySelector('[aria-labelledby="pending-heading"]')

    it('lists the games from your groups you have not rated, once your groups have loaded', async () => {
        const { element } = await render()

        expect(waiting(element)?.textContent).toContain('Azul')
        expect(waiting(element)?.textContent).not.toContain('Root')
    })

    it('does not leave the list silently empty while your groups load', async () => {
        const { element } = await render({ groups: 'loading' })

        expect(waiting(element)).toBeNull()
        expect(element.querySelector('app-async')?.getAttribute('aria-busy')).toBe('true')
        expect(element.querySelector('[role="alert"]')).toBeNull()
    })

    it('says the games are missing, with Retry, when your groups failed', async () => {
        const { element, refreshUserGroups } = await render({ groups: 'error' })
        const alert = element.querySelector('app-async [role="alert"]')

        expect(waiting(element)).toBeNull()
        expect(alert?.textContent).toContain('The games from your groups could not be loaded')
        alert?.querySelector('button')?.click()
        expect(refreshUserGroups).toHaveBeenCalledTimes(1)
    })

    it('shows no rating as missing while your own ratings are still loading', async () => {
        const { element } = await render({ reviews: 'loading' })

        expect(waiting(element)).toBeNull()
        expect(element.textContent).not.toContain('Azul')
    })
})
