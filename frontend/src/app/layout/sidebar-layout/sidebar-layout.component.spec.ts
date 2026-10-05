import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { SidebarGroup, SidebarLayoutComponent } from './sidebar-layout.component'

@Component({ template: '<h2>Profile section</h2>' })
class ProfileStubComponent {}

@Component({
    imports: [SidebarLayoutComponent],
    template: '<app-sidebar-layout title="Settings" basePath="/settings" [groups]="groups" />',
})
class SettingsStubComponent {
    groups: Array<SidebarGroup> = [
        { items: [{ label: 'Profile', icon: 'user-circle', link: '/settings/profile' }] },
        {
            label: 'Administration',
            items: [{ label: 'Proposals', icon: 'file-text', link: '/admin/proposals', badge: 3, badgeLabel: 'pending' }],
        },
    ]
}

describe('SidebarLayoutComponent', () => {
    let desktop: boolean

    beforeEach(() => {
        desktop = false
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: desktop }) })
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: 'settings',
                        component: SettingsStubComponent,
                        children: [{ path: 'profile', component: ProfileStubComponent }],
                    },
                    { path: 'admin/proposals', component: ProfileStubComponent },
                    { path: 'dashboard', component: ProfileStubComponent },
                ]),
            ],
        })
    })

    afterEach(() => Reflect.deleteProperty(window, 'matchMedia'))

    it('shows the section list, not a section, at the base route on phones', async () => {
        const harness = await RouterTestingHarness.create('/settings')
        const element: HTMLElement = harness.fixture.nativeElement

        expect(TestBed.inject(Router).url).toBe('/settings')
        expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Settings sections')
        expect(element.textContent).not.toContain('Profile section')
        expect(element.querySelector('#sidebar-group-1')?.textContent).toContain('Administration')
        expect(element.textContent).toContain('3 pending')
    })

    it('opens the first section at the base route on desktop', async () => {
        desktop = true
        const harness = await RouterTestingHarness.create('/settings')
        await harness.fixture.whenStable()
        harness.detectChanges()

        expect(TestBed.inject(Router).url).toBe('/settings/profile')
        expect((harness.fixture.nativeElement as HTMLElement).textContent).toContain('Profile section')
    })

    it('marks the open section and offers a way back to the list on phones', async () => {
        const harness = await RouterTestingHarness.create('/settings/profile')
        harness.detectChanges()
        const element: HTMLElement = harness.fixture.nativeElement
        const current = element.querySelector('nav a[aria-current="page"]')

        expect(current?.textContent).toContain('Profile')
        expect(element.querySelector('a[href="/settings"]')?.textContent).toContain('Settings')
        expect(element.querySelector('h1')?.classList).toContain('sr-only')
    })
})
