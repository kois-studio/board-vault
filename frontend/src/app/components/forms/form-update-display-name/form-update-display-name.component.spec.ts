import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import type { UserType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { ApiUnavailableError } from '../../../core/utils/apiUnavailable'
import { FormUpdateDisplayNameComponent } from './form-update-display-name.component'

describe('FormUpdateDisplayNameComponent (#242)', () => {
    const user = { id: 1, displayName: 'Organizer' } as UserType
    let fixture: ComponentFixture<FormUpdateDisplayNameComponent>
    let currentUser: ReturnType<typeof signal<UserType | null>>
    let save: { resolve: () => void; reject: (error: unknown) => void }
    let updateCurrentUserData: ReturnType<typeof vi.fn>

    const element = () => fixture.nativeElement as HTMLElement
    const input = () => element().querySelector('input') as HTMLInputElement
    const button = (label: string) =>
        Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement
    const error = () => element().querySelector('[data-testid="display-name-save-error"]')

    beforeEach(() => {
        currentUser = signal<UserType | null>(structuredClone(user))
        updateCurrentUserData = vi.fn(
            () =>
                new Promise<void>((resolve, reject) => {
                    save = { resolve, reject }
                }),
        )
        TestBed.configureTestingModule({
            imports: [FormUpdateDisplayNameComponent],
            providers: [{ provide: DataService, useValue: { currentUser, updateCurrentUserData } }],
        })
        fixture = TestBed.createComponent(FormUpdateDisplayNameComponent)
        fixture.detectChanges()
        document.body.append(element())
    })

    afterEach(() => element().remove())

    const typeAndSave = async (name: string) => {
        button('Change display name').click()
        fixture.detectChanges()
        input().value = name
        input().dispatchEvent(new Event('input'))
        fixture.detectChanges()
        button('Save').click()
        fixture.detectChanges()
    }

    const settle = async () => {
        await fixture.whenStable()
        fixture.detectChanges()
    }

    it('stays in edit mode with the name locked and Save busy until Board Vault answers', async () => {
        await typeAndSave('Host')

        expect(updateCurrentUserData).toHaveBeenCalledWith({ displayName: 'Host' })
        expect(input().disabled).toBe(true)
        expect(input().value).toBe('Host')
        expect(button('Save').getAttribute('aria-busy')).toBe('true')
        expect(button('Cancel').disabled).toBe(true)
    })

    it('leaves edit mode once saved, showing the stored name, with focus on Change display name', async () => {
        await typeAndSave('Host')
        currentUser.set({ ...user, displayName: 'Host' })
        save.resolve()
        await settle()

        expect(button('Change display name')).toBeTruthy()
        expect(input().disabled).toBe(true)
        expect(input().value).toBe('Host')
        expect(error()).toBeNull()
        expect(document.activeElement).toBe(button('Change display name'))
    })

    it('when not saved, keeps the typed name in an open field and says so next to it', async () => {
        await typeAndSave('Host')
        save.reject(new HttpErrorResponse({ status: 503 }))
        await settle()

        expect(button('Save')).toBeTruthy()
        expect(input().disabled).toBe(false)
        expect(input().value).toBe('Host')
        expect(input().getAttribute('aria-invalid')).toBe('true')
        expect(error()?.getAttribute('role')).toBe('alert')
        expect(error()?.textContent).toContain('Your new name wasn’t saved. Try again.')
        expect(currentUser()?.displayName).toBe('Organizer')
        expect(document.activeElement).toBe(input())
    })

    it('says it could not confirm the save when Board Vault did not answer in time', async () => {
        await typeAndSave('Host')
        save.reject(new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/users/1' }))
        await settle()

        expect(error()?.textContent).toContain('We couldn’t confirm your new name was saved. Try again.')
    })

    it('saves again from the same field, and the message goes once it is saved', async () => {
        await typeAndSave('Host')
        save.reject(new HttpErrorResponse({ status: 503 }))
        await settle()

        button('Save').click()
        fixture.detectChanges()
        expect(updateCurrentUserData).toHaveBeenCalledTimes(2)
        expect(error()).toBeNull()

        save.resolve()
        await settle()
        expect(button('Change display name')).toBeTruthy()
    })

    it('Cancel after a failure goes back to the stored name', async () => {
        await typeAndSave('Host')
        save.reject(new HttpErrorResponse({ status: 503 }))
        await settle()

        button('Cancel').click()
        fixture.detectChanges()

        expect(input().value).toBe('Organizer')
        expect(error()).toBeNull()
    })

    it('does not replace what is being typed when the account is read again', async () => {
        button('Change display name').click()
        fixture.detectChanges()
        input().value = 'Hos'
        input().dispatchEvent(new Event('input'))

        currentUser.set({ ...user, displayName: 'Organizer', username: 'organizer2' } as UserType)
        await settle()

        expect(input().value).toBe('Hos')
    })

    it('answers quietly when the page was left while it saved', async () => {
        button('Change display name').click()
        fixture.detectChanges()
        input().value = 'Host'
        input().dispatchEvent(new Event('input'))
        const saved = fixture.componentInstance.onSave()

        fixture.destroy()
        save.reject(new HttpErrorResponse({ status: 500 }))

        await expect(saved).resolves.toBeUndefined()
        expect(fixture.componentInstance.saveError()).toBe('not-saved')
        expect(fixture.componentInstance.isSaving()).toBe(false)
    })
})
