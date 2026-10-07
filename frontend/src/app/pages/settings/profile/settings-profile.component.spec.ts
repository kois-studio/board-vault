import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Api } from '../../../api/api'
import type { UserType } from '../../../api/api.types'
import { DataService } from '../../../core/services/data.service'
import { SettingsProfileComponent } from './settings-profile.component'

describe('SettingsProfileComponent avatar editor', () => {
    let fixture: ComponentFixture<SettingsProfileComponent>

    const currentUser: UserType = {
        id: 1,
        email: 'organizer+clerk_test@example.com',
        username: 'organizer',
        displayName: 'Organizer',
        avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
        createdAt: '2026-09-01T10:00:00.000Z',
    }

    const dataService = {
        currentUser: signal<UserType | null>(null),
        updateCurrentUserData: vi.fn().mockName('updateCurrentUserData'),
    }
    const api = { updateUser: vi.fn().mockName('updateUser') }

    const dialog = (): HTMLElement | null => fixture.nativeElement.querySelector('app-modal-avatar-editor app-avatar-editor')

    beforeEach(async () => {
        dataService.currentUser.set(structuredClone(currentUser))
        dataService.updateCurrentUserData.mockClear()
        api.updateUser.mockClear()

        await TestBed.configureTestingModule({
            imports: [SettingsProfileComponent],
            providers: [provideRouter([]), { provide: DataService, useValue: dataService }, { provide: Api, useValue: api }],
        }).compileComponents()

        fixture = TestBed.createComponent(SettingsProfileComponent)
        fixture.detectChanges()
    })

    it('opens the avatar editor from the Edit button and closes it again', () => {
        expect(dialog()).toBeNull()

        const editButton = fixture.nativeElement.querySelector('button[aria-label="Edit profile avatar"]') as HTMLButtonElement
        editButton.click()
        fixture.detectChanges()

        expect(dialog()).not.toBeNull()

        const closeButton = fixture.nativeElement.querySelector('button[aria-label="Close avatar editor"]') as HTMLButtonElement
        closeButton.click()
        fixture.detectChanges()

        expect(dialog()).toBeNull()
    })

    it('saves a chosen avatar once, through the shared profile update', () => {
        ;(fixture.nativeElement.querySelector('button[aria-label="Edit profile avatar"]') as HTMLButtonElement).click()
        fixture.detectChanges()

        const editor = fixture.debugElement.query((element) => element.name === 'app-avatar-editor')
        editor.componentInstance.selectColor('#10B981')

        expect(dataService.updateCurrentUserData).toHaveBeenCalledTimes(1)
        expect(dataService.updateCurrentUserData).toHaveBeenCalledWith({
            avatar: expect.objectContaining({ backgroundColor: '#10B981', type: 'icon', iconName: 'person-fill' }),
        })
        expect(api.updateUser).not.toHaveBeenCalled()
    })

    it('leaves the current user unchanged until the save succeeds', () => {
        ;(fixture.nativeElement.querySelector('button[aria-label="Edit profile avatar"]') as HTMLButtonElement).click()
        fixture.detectChanges()

        const editor = fixture.debugElement.query((element) => element.name === 'app-avatar-editor')
        editor.componentInstance.selectColor('#10B981')
        fixture.detectChanges()

        // updateCurrentUserData is stubbed, as if the request failed: the shared user state must not show the change.
        expect(dataService.currentUser()?.avatar).toEqual(currentUser.avatar)
    })

    it('shows the username read-only and points to Account to change it', () => {
        const element: HTMLElement = fixture.nativeElement

        expect(element.querySelector('[data-testid="profile-username"]')?.textContent?.trim()).toBe('organizer')
        expect(element.querySelector('input[formControlName="username"]')).toBeNull()
        expect(element.querySelector('a[href="/settings/account"]')).not.toBeNull()
    })
})
