import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LoginService } from '../../core/services/login.service'
import { UsageNoticeComponent } from './usage-notice.component'

async function render(settings: { usageAnalytics: boolean; noticeAnswered: boolean }) {
    const updatePrivacySettings = vi.fn((body: { usageAnalytics: boolean }) => of({ ...body, noticeAnswered: true }))
    await TestBed.configureTestingModule({
        imports: [UsageNoticeComponent],
        providers: [
            provideRouter([]),
            { provide: Api, useValue: { getPrivacySettings: () => of(settings), updatePrivacySettings } },
            { provide: LoginService, useValue: { isAuthenticated: signal(true) } },
            { provide: ToastService, useValue: { error: vi.fn() } },
        ],
    }).compileComponents()
    const fixture = TestBed.createComponent(UsageNoticeComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()

    const element = fixture.nativeElement as HTMLElement
    const settle = async () => {
        await fixture.whenStable()
        fixture.detectChanges()
    }

    return { element, settle, updatePrivacySettings }
}

describe('UsageNoticeComponent', () => {
    it('stays away once the notice has been answered', async () => {
        const { element } = await render({ usageAnalytics: true, noticeAnswered: true })

        expect(element.querySelector('section')).toBeNull()
    })

    it('asks once with the switch on, and is warm about turning it off', async () => {
        const { element, settle, updatePrivacySettings } = await render({ usageAnalytics: true, noticeAnswered: false })
        const toggle = element.querySelector<HTMLButtonElement>('[role="switch"]')

        expect(element.textContent).toContain('Lend us a hand?')
        expect(toggle?.getAttribute('aria-checked')).toBe('true')
        expect(element.querySelector('a')?.getAttribute('href')).toBe('/settings/privacy')

        toggle?.click()
        await settle()

        expect(updatePrivacySettings).toHaveBeenCalledWith({ usageAnalytics: false })
        expect(toggle?.getAttribute('aria-checked')).toBe('false')
        expect(element.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
            'No problem, thanks for playing anyway! Change it anytime in Settings → Privacy.',
        )
    })

    it('"Got it" keeps the switch as it is and closes the card', async () => {
        const { element, settle, updatePrivacySettings } = await render({ usageAnalytics: true, noticeAnswered: false })
        const gotIt = Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.includes('Got it'))

        gotIt?.click()
        await settle()

        expect(updatePrivacySettings).toHaveBeenCalledWith({ usageAnalytics: true })
        expect(element.querySelector('section')).toBeNull()
    })
})
