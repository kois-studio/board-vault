import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { LayoutFooterComponent } from './footer.component'

describe('LayoutFooterComponent', () => {
    let fixture: ComponentFixture<LayoutFooterComponent>
    const isAuthenticated = signal(false)

    const element = () => fixture.nativeElement as HTMLElement
    const linkTexts = () => Array.from(element().querySelectorAll('footer a')).map((link) => link.textContent?.trim())

    beforeEach(async () => {
        isAuthenticated.set(false)
        await TestBed.configureTestingModule({
            imports: [LayoutFooterComponent],
            providers: [provideRouter([]), { provide: LoginService, useValue: { isAuthenticated } }],
        }).compileComponents()

        fixture = TestBed.createComponent(LayoutFooterComponent)
        fixture.detectChanges()
    })

    it('shows signed-out visitors the landing sections, sign-in, and the theme switch', () => {
        expect(linkTexts()).toEqual(['Features', 'How it works', 'FAQ', 'Source code on GitHub', 'Sign in', 'Create an account'])
        expect(element().querySelector('app-theme-switch')).not.toBeNull()
    })

    it('shows signed-in people one line on desktop and nothing on phones', () => {
        isAuthenticated.set(true)
        fixture.detectChanges()

        const footer = element().querySelector('footer')
        expect(footer?.classList).toContain('hidden')
        expect(footer?.classList).toContain('lg:block')
        expect(linkTexts()).toEqual(['Source code on GitHub'])
        // The theme switch lives in the avatar menu.
        expect(element().querySelector('app-theme-switch')).toBeNull()
    })
})
