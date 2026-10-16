import { Component, DestroyRef, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import { LoginService } from './login.service'
import { CurrentViewService, UsageService } from './usage.service'

@Component({ template: '' })
class BlankComponent {}

describe('UsageService', () => {
    const recordNavigation = vi.fn(() => of(undefined))
    const isAuthenticated = signal(false)

    beforeEach(() => {
        recordNavigation.mockClear()
        isAuthenticated.set(false)
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: '', component: BlankComponent },
                    { path: 'play', component: BlankComponent },
                    { path: 'groups/:groupId', component: BlankComponent },
                    { path: 'admin/usage', component: BlankComponent },
                ]),
                { provide: Api, useValue: { recordNavigation } },
                { provide: LoginService, useValue: { isAuthenticated } },
            ],
        })
        TestBed.inject(UsageService).start(TestBed.inject(DestroyRef))
    })

    it('counts pages as route templates with the page before, never the address', async () => {
        isAuthenticated.set(true)
        const router = TestBed.inject(Router)

        await router.navigateByUrl('/play')
        await router.navigateByUrl('/groups/12')

        expect(recordNavigation.mock.calls).toEqual([
            ['/play', undefined],
            ['/groups/:groupId', '/play'],
        ])
        expect(TestBed.inject(CurrentViewService).view()).toBe('/groups/:groupId')
    })

    it('counts the first page once sign-in finishes, and only once', async () => {
        await TestBed.inject(Router).navigateByUrl('/groups/3')
        expect(recordNavigation).not.toHaveBeenCalled()

        isAuthenticated.set(true)
        TestBed.tick()
        isAuthenticated.set(false)
        TestBed.tick()
        isAuthenticated.set(true)
        TestBed.tick()

        expect(recordNavigation.mock.calls).toEqual([['/groups/:groupId', undefined]])
    })

    it('does not count admin pages', async () => {
        isAuthenticated.set(true)
        await TestBed.inject(Router).navigateByUrl('/admin/usage')

        expect(recordNavigation).not.toHaveBeenCalled()
    })
})
