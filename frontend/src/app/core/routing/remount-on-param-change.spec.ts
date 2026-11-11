import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, RouteReuseStrategy } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { routes } from '../../app.routes'
import { RemountOnParamChangeStrategy, remountOnParamChange } from './remount-on-param-change'

let built = 0

@Component({ template: 'page' })
class PageComponent {
    readonly instance = ++built
}

describe('RemountOnParamChangeStrategy', () => {
    let harness: RouterTestingHarness

    beforeEach(async () => {
        built = 0
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'nights/:id', component: PageComponent, data: remountOnParamChange },
                    { path: 'groups/:id', component: PageComponent },
                ]),
                { provide: RouteReuseStrategy, useClass: RemountOnParamChangeStrategy },
            ],
        })
        harness = await RouterTestingHarness.create()
    })

    it('builds the page afresh when its address points to another one', async () => {
        const first = await harness.navigateByUrl('/nights/1', PageComponent)
        const second = await harness.navigateByUrl('/nights/2', PageComponent)

        expect(second).not.toBe(first)
        expect(built).toBe(2)
    })

    it('keeps the page for the same address, whatever the query', async () => {
        const first = await harness.navigateByUrl('/nights/1', PageComponent)
        const again = await harness.navigateByUrl('/nights/1?saved=1', PageComponent)

        expect(again).toBe(first)
        expect(built).toBe(1)
    })

    it('keeps Angular’s own reuse for routes not marked', async () => {
        const first = await harness.navigateByUrl('/groups/1', PageComponent)
        const second = await harness.navigateByUrl('/groups/2', PageComponent)

        expect(second).toBe(first)
        expect(built).toBe(1)
    })
})

describe('the app’s routes (#258 follow-up)', () => {
    const find = (path: string) => routes.flatMap((route) => [route, ...(route.children ?? [])]).find((route) => route.path === path)

    it('give each game night a page of its own', () => {
        expect(find('sessions/:sessionId')?.data).toEqual(remountOnParamChange)
    })
})
