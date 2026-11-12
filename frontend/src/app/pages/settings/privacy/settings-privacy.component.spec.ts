import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { SettingsPrivacyComponent } from './settings-privacy.component'

describe('SettingsPrivacyComponent', () => {
    it('shows the current choice and turns usage statistics off', async () => {
        const updatePrivacySettings = vi.fn(() => of({ usageAnalytics: false }))
        await TestBed.configureTestingModule({
            imports: [SettingsPrivacyComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getPrivacySettings: () => of({ usageAnalytics: true }), updatePrivacySettings } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(SettingsPrivacyComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()

        const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[role="switch"]')
        expect(toggle?.getAttribute('aria-checked')).toBe('true')

        toggle?.click()
        await fixture.whenStable()
        fixture.detectChanges()

        expect(updatePrivacySettings).toHaveBeenCalledWith({ usageAnalytics: false })
        expect(toggle?.getAttribute('aria-checked')).toBe('false')
    })

    async function renderWith(getPrivacySettings: () => unknown) {
        await TestBed.configureTestingModule({
            imports: [SettingsPrivacyComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getPrivacySettings, updatePrivacySettings: vi.fn() } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(SettingsPrivacyComponent)
        fixture.detectChanges()
        return fixture
    }

    it('holds the place of the switch while your choice loads (#261)', async () => {
        const answer = new Subject<{ usageAnalytics: boolean }>()
        const fixture = await renderWith(() => answer)
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('[data-testid="switch-skeleton"]')).not.toBeNull()
        expect(element.textContent).toContain('Loading your choice…')
        expect(element.querySelector('[role="switch"]')).toBeNull()

        answer.next({ usageAnalytics: false })
        answer.complete()
        await fixture.whenStable()
        fixture.detectChanges()
        expect(element.querySelector('[data-testid="switch-skeleton"]')).toBeNull()
        expect(element.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false')
    })

    it('shows the error, not a loading switch, when your choice could not load (#261)', async () => {
        const fixture = await renderWith(() => throwError(() => new Error('offline')))
        await fixture.whenStable()
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('[data-testid="switch-skeleton"]')).toBeNull()
        expect(element.textContent).toContain('Your choice could not be loaded.')
    })
})
