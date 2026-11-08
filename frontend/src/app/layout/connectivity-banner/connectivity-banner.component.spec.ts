import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ConnectivityService } from '../../core/services/connectivity.service'
import { LoginService } from '../../core/services/login.service'
import { ConnectivityBannerComponent } from './connectivity-banner.component'

describe('ConnectivityBannerComponent (#241)', () => {
    const setup = (signedIn = true) => {
        const isAuthenticated = signal(signedIn)
        TestBed.configureTestingModule({
            imports: [ConnectivityBannerComponent],
            providers: [{ provide: LoginService, useValue: { isAuthenticated } }],
        })
        const fixture = TestBed.createComponent(ConnectivityBannerComponent)
        const connectivity = TestBed.inject(ConnectivityService)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const banner = () => element.querySelector('[data-testid="connectivity-banner"]')
        const render = () => fixture.detectChanges()
        return { fixture, connectivity, element, banner, render, isAuthenticated }
    }

    it('shows nothing while Board Vault answers, but keeps its status region ready to announce', () => {
        const { element, banner } = setup()

        expect(banner()).toBeNull()
        expect(element.querySelector('[role="status"]')).not.toBeNull()
    })

    it('says Board Vault cannot be reached, inside the status region, and goes away when it answers', () => {
        const { connectivity, element, banner, render } = setup()

        connectivity.reportUnreachable()
        render()

        expect(element.querySelector('[role="status"]')?.contains(banner())).toBe(true)
        expect(banner()?.textContent).toContain('We can’t reach Board Vault right now.')
        expect(banner()?.textContent).toContain('changes won’t save until we’re back')

        connectivity.reportAnswered()
        render()
        expect(banner()).toBeNull()
    })

    it('reloads on Try again and shows it is checking until the next request ends', () => {
        const { connectivity, element, render } = setup()
        const refreshes = vi.fn()
        connectivity.refreshes.subscribe(refreshes)
        connectivity.reportUnreachable()
        render()
        const button = () => element.querySelector('button') as HTMLButtonElement

        expect(button().textContent).toContain('Try again')
        button().click()
        render()

        expect(refreshes).toHaveBeenCalledTimes(1)
        expect(button().disabled).toBe(true)
        connectivity.reportUnreachable()
        render()
        expect(button().disabled).toBe(false)
    })

    describe('focus after Try again', () => {
        const setupWithPage = () => {
            const page = document.createElement('main')
            page.id = 'main-content'
            page.tabIndex = -1
            document.body.append(page)
            const result = setup()
            document.body.append(result.element)
            result.connectivity.reportUnreachable()
            result.render()
            const button = () => result.element.querySelector('button') as HTMLButtonElement
            button().focus()
            button().click()
            result.render()
            return { ...result, page, button }
        }
        afterEach(() => {
            document.getElementById('main-content')?.remove()
        })

        it('goes back to Try again when Board Vault still cannot be reached', async () => {
            const { connectivity, fixture, button } = setupWithPage()

            connectivity.reportUnreachable()
            fixture.detectChanges()
            await fixture.whenStable()

            expect(document.activeElement).toBe(button())
        })

        it('goes to the page once the banner is gone', async () => {
            const { connectivity, fixture, page } = setupWithPage()

            connectivity.reportAnswered()
            fixture.detectChanges()
            await fixture.whenStable()

            expect(document.activeElement).toBe(page)
        })
    })

    it('stays hidden until the account is known: the sign-in handoff screen says it then', () => {
        const { connectivity, banner, render, isAuthenticated } = setup(false)

        connectivity.reportUnreachable()
        render()
        expect(banner()).toBeNull()

        isAuthenticated.set(true)
        render()
        expect(banner()).not.toBeNull()
    })
})
