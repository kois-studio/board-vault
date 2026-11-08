import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import type { UserType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { ApiUnavailableError } from '../../../core/utils/apiUnavailable'
import { AvatarEditorComponent } from '../../avatar-editor/avatar-editor.component'
import { ModalAvatarEditorComponent } from './modal-avatar-editor.component'

describe('ModalAvatarEditorComponent (#242)', () => {
    const avatar: UserType['avatar'] = { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' }
    let fixture: ComponentFixture<ModalAvatarEditorComponent>
    let currentUser: ReturnType<typeof signal<UserType | null>>
    let save: { resolve: () => void; reject: (error: unknown) => void }
    let updateCurrentUserData: ReturnType<typeof vi.fn>

    const element = () => fixture.nativeElement as HTMLElement
    const editor = () => fixture.debugElement.query((node) => node.name === 'app-avatar-editor')?.componentInstance as AvatarEditorComponent
    const button = (label: string) =>
        Array.from(element().querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement
    const closeButton = () => element().querySelector('button[aria-label="Close avatar editor"]') as HTMLButtonElement
    const error = () => element().querySelector('[data-testid="avatar-save-error"]')

    beforeEach(() => {
        currentUser = signal<UserType | null>({ id: 1, avatar } as UserType)
        updateCurrentUserData = vi.fn(
            () =>
                new Promise<void>((resolve, reject) => {
                    save = { resolve, reject }
                }),
        )
        TestBed.configureTestingModule({
            imports: [ModalAvatarEditorComponent],
            providers: [{ provide: DataService, useValue: { currentUser, updateCurrentUserData } }],
        })
        fixture = TestBed.createComponent(ModalAvatarEditorComponent)
        fixture.componentInstance.showDialog()
        fixture.detectChanges()
        document.body.append(element())
    })

    afterEach(() => element().remove())

    const settle = async () => {
        await fixture.whenStable()
        fixture.detectChanges()
    }

    it('saves nothing on a pick, and once on Save with the last picks', async () => {
        editor().selectColor('#EF4444')
        editor().selectEmoji('🎲')
        fixture.detectChanges()
        expect(updateCurrentUserData).not.toHaveBeenCalled()

        button('Save avatar').click()
        fixture.detectChanges()

        expect(updateCurrentUserData).toHaveBeenCalledTimes(1)
        expect(updateCurrentUserData).toHaveBeenCalledWith({
            avatar: { backgroundColor: '#EF4444', iconName: null, emoji: '🎲', type: 'emoji', initials: 'OR' },
        })
        expect(button('Save avatar').getAttribute('aria-busy')).toBe('true')
    })

    it('closes once saved', async () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        button('Save avatar').click()
        save.resolve()
        await settle()

        expect(fixture.componentInstance.isVisible()).toBe(false)
        expect(error()).toBeNull()
    })

    it('when not saved, stays open with the picks and says so next to Save, with focus back on Save', async () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        button('Save avatar').click()
        fixture.detectChanges()
        save.reject(new HttpErrorResponse({ status: 503 }))
        await settle()

        expect(fixture.componentInstance.isVisible()).toBe(true)
        expect(editor().draft().backgroundColor).toBe('#EF4444')
        expect(error()?.getAttribute('role')).toBe('alert')
        expect(error()?.textContent).toContain('Your new avatar wasn’t saved. Try again.')
        expect(document.activeElement).toBe(button('Save avatar'))
        expect(currentUser()?.avatar).toEqual(avatar)
    })

    it('says it could not confirm the save when Board Vault did not answer in time', async () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        button('Save avatar').click()
        save.reject(new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/users/1' }))
        await settle()

        expect(error()?.textContent).toContain('We couldn’t confirm your new avatar was saved. Try again.')
    })

    it('does not close while saving, so the answer has somewhere to show', () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        button('Save avatar').click()
        fixture.detectChanges()

        fixture.componentInstance.hideDialog()
        fixture.detectChanges()

        expect(fixture.componentInstance.isVisible()).toBe(true)
        expect(closeButton().disabled).toBe(true)
        expect(button('Cancel').disabled).toBe(true)
    })

    it('closing discards the picks: opening again starts from the stored avatar', () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        closeButton().click()
        fixture.detectChanges()

        fixture.componentInstance.showDialog()
        fixture.detectChanges()

        expect(editor().draft()).toEqual(avatar)
        expect(button('Save avatar').disabled).toBe(true)
    })

    it('keeps the picks when the account is read again while the dialog is open', () => {
        editor().selectColor('#EF4444')
        currentUser.set({ id: 1, avatar: { ...avatar, initials: 'OG' } } as UserType)
        fixture.detectChanges()

        expect(editor().draft().backgroundColor).toBe('#EF4444')
    })

    it('has nothing to save without a change, or with an initials avatar without initials', () => {
        expect(button('Save avatar').disabled).toBe(true)

        editor().selectColor('#EF4444')
        editor().selectColor(avatar.backgroundColor)
        fixture.detectChanges()
        expect(button('Save avatar').disabled).toBe(true)

        editor().setInitials('')
        fixture.detectChanges()
        expect(button('Save avatar').disabled).toBe(true)

        editor().setInitials('bv')
        fixture.detectChanges()
        expect(button('Save avatar').disabled).toBe(false)
    })

    it('takes no picks while it saves, so a failure is about what is still shown', async () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        button('Save avatar').click()
        fixture.detectChanges()

        fixture.componentInstance.pick({ ...avatar, backgroundColor: '#10B981' })
        save.reject(new HttpErrorResponse({ status: 500 }))
        await settle()

        expect(fixture.componentInstance.draft()?.backgroundColor).toBe('#EF4444')
        expect(error()).not.toBeNull()
    })

    it('answers quietly when the page was left while it saved', async () => {
        editor().selectColor('#EF4444')
        fixture.detectChanges()
        const saved = fixture.componentInstance.save()

        fixture.destroy()
        save.reject(new HttpErrorResponse({ status: 500 }))

        await expect(saved).resolves.toBeUndefined()
        expect(fixture.componentInstance.isSaving()).toBe(false)
    })
})
