import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { SettingsPrivacyComponent } from './settings-privacy.component'

describe('SettingsPrivacyComponent', () => {
    it('shows the current choice and turns usage statistics off', async () => {
        const updatePrivacySettings = vi.fn(() => of({ usageAnalytics: false }))
        await TestBed.configureTestingModule({
            imports: [SettingsPrivacyComponent],
            providers: [
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
})
