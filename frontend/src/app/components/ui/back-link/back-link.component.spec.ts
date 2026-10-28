import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, RouterLink } from '@angular/router'
import { BackLinkComponent } from './back-link.component'

@Component({
    imports: [BackLinkComponent, RouterLink],
    template: `<a appBackLink [routerLink]="['/groups', 4]" [queryParams]="{ tab: 'people' }">Back to the group</a>`,
})
class HostComponent {}

describe('BackLinkComponent', () => {
    it('stays a native link to where it goes, with a hidden arrow before its text', async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents()
        const fixture = TestBed.createComponent(HostComponent)
        fixture.detectChanges()

        const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement
        expect(link.getAttribute('href')).toBe('/groups/4?tab=people')
        expect(link.textContent?.trim()).toBe('Back to the group')
        expect(link.querySelector('app-icon')?.getAttribute('aria-hidden')).toBe('true')
        // A touch target of at least 44 px, like the app's other links.
        expect(link.classList).toContain('min-h-11')
    })
})
