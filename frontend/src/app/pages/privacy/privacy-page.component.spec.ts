import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { CONTACT_EMAIL, DATA_CONTROLLER } from '../../core/contact'
import { PrivacyPageComponent } from './privacy-page.component'

describe('PrivacyPageComponent', () => {
    let fixture: ComponentFixture<PrivacyPageComponent>
    const element = () => fixture.nativeElement as HTMLElement

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PrivacyPageComponent],
            providers: [provideRouter([])],
        }).compileComponents()

        fixture = TestBed.createComponent(PrivacyPageComponent)
        fixture.detectChanges()
    })

    it('names who is responsible and how to write to them', () => {
        expect(element().textContent).toContain(DATA_CONTROLLER)
        const mailLinks = Array.from(element().querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]'))
        expect(mailLinks.length).toBeGreaterThan(0)
        for (const link of mailLinks) {
            expect(link.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}?subject=About%20my%20data%20in%20Board%20Vault`)
            expect(link.textContent?.trim()).toBe(CONTACT_EMAIL)
        }
    })

    it('has one main heading and links to the settings people can change themselves', () => {
        expect(element().querySelectorAll('h1').length).toBe(1)
        const settingsLinks = Array.from(element().querySelectorAll('a[href^="/settings/"]')).map((link) => link.getAttribute('href'))
        expect(new Set(settingsLinks)).toEqual(new Set(['/settings/privacy', '/settings/account', '/settings/profile']))
    })
})
