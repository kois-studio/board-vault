import { provideLocationMocks } from '@angular/common/testing'
import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router } from '@angular/router'
import { AppComponent } from './app.component'

@Component({ template: '' })
class EmptyRouteComponent {}

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
        }).compileComponents()
    })

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent)
        const app = fixture.componentInstance
        expect(app).toBeTruthy()
    })

    it('publishes private-beta metadata and a canonical URL', () => {
        TestBed.createComponent(AppComponent)

        expect(document.title).toBe('Board Vault — Game night, remembered')
        expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow, noarchive')
        expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Board Vault — Game night, remembered')
        expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain('/images/logo.webp')
        expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(window.location.origin)
    })

    it('provides a keyboard skip link that stays on the current route', async () => {
        TestBed.resetTestingModule()
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [provideRouter([{ path: 'groups/:groupId', component: EmptyRouteComponent }]), provideLocationMocks()],
        }).compileComponents()
        const fixture = TestBed.createComponent(AppComponent)
        await TestBed.inject(Router).navigateByUrl('/groups/7')
        fixture.detectChanges()

        // A bare "#main-content" would resolve against <base href="/"> and leave the route.
        const skipLink = fixture.nativeElement.querySelector('a[appInPageLink="main-content"]') as HTMLAnchorElement
        expect(skipLink.textContent).toContain('Skip to main content')
        expect(skipLink.getAttribute('href')).toBe('/groups/7#main-content')
    })

    // it(`should have the 'frontend' title`, () => {
    //     const fixture = TestBed.createComponent(AppComponent);
    //     const app = fixture.componentInstance;
    //     expect(app.title).toEqual('frontend');
    // });

    // it('should render title', () => {
    //     const fixture = TestBed.createComponent(AppComponent);
    //     fixture.detectChanges();
    //     const compiled = fixture.nativeElement as HTMLElement;
    //     expect(compiled.querySelector('h1')?.textContent).toContain('Hello, frontend');
    // });
})
