import { TestBed } from '@angular/core/testing'
import { AppComponent } from './app.component'

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
