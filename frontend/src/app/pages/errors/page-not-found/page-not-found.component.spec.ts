import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LoginService } from '../../../core/services/login.service'
import { PageNotFoundComponent } from './page-not-found.component'

describe('PageNotFoundComponent', () => {
    let fixture: ComponentFixture<PageNotFoundComponent>
    const isAuthenticated = signal(false)

    const element = () => fixture.nativeElement as HTMLElement
    const homeLink = () => element().querySelector('a') as HTMLAnchorElement

    beforeEach(async () => {
        isAuthenticated.set(false)
        await TestBed.configureTestingModule({
            imports: [PageNotFoundComponent],
            providers: [provideRouter([]), { provide: LoginService, useValue: { isAuthenticated } }],
        }).compileComponents()

        fixture = TestBed.createComponent(PageNotFoundComponent)
        fixture.detectChanges()
    })

    it('says the page was not found, in one heading and no landmark of its own', () => {
        expect(element().querySelectorAll('h1')).toHaveLength(1)
        expect(element().querySelector('h1')?.textContent).toContain('Page not found')
        // The layout already has the page's <main>; a second one would leave two.
        expect(element().querySelector('main')).toBeNull()
        expect(element().querySelector('h2')).toBeNull()
    })

    it('takes a signed-out visitor to the landing page', () => {
        expect(homeLink().textContent?.trim()).toBe('Go back home')
        expect(homeLink().getAttribute('href')).toBe('/')
    })

    it('takes a signed-in person to their Home', () => {
        isAuthenticated.set(true)
        fixture.detectChanges()

        expect(homeLink().getAttribute('href')).toBe('/dashboard')
    })
})
