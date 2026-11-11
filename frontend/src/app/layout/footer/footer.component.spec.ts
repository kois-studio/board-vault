import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { LayoutFooterComponent } from './footer.component'

describe('LayoutFooterComponent', () => {
    let fixture: ComponentFixture<LayoutFooterComponent>
    const showsAppFrame = signal(false)

    const element = () => fixture.nativeElement as HTMLElement
    const linkTexts = () => Array.from(element().querySelectorAll('footer a')).map((link) => link.textContent?.trim())

    beforeEach(async () => {
        showsAppFrame.set(false)
        await TestBed.configureTestingModule({
            imports: [LayoutFooterComponent],
            providers: [provideRouter([]), { provide: AccountPendingService, useValue: { showsAppFrame } }],
        }).compileComponents()

        fixture = TestBed.createComponent(LayoutFooterComponent)
        fixture.detectChanges()
    })

    it('shows signed-out visitors the landing sections, sign-in, privacy, contact, and the theme switch', () => {
        expect(linkTexts()).toEqual([
            'Features',
            'How it works',
            'FAQ',
            'Source code on GitHub',
            'Sign in',
            'Create an account',
            'Privacy',
            'Contact',
        ])
        expect(element().querySelector('a[href^="mailto:contact@kois.app"]')).not.toBeNull()
        expect(element().querySelector('app-theme-switch')).not.toBeNull()
    })

    it('shows signed-in people one line on desktop and nothing on phones', () => {
        showsAppFrame.set(true)
        fixture.detectChanges()

        const footer = element().querySelector('footer')
        expect(footer?.classList).toContain('hidden')
        expect(footer?.classList).toContain('lg:block')
        expect(linkTexts()).toEqual(['Privacy', 'Contact', 'Source code on GitHub'])
        // The theme switch lives in the avatar menu.
        expect(element().querySelector('app-theme-switch')).toBeNull()
    })
})
