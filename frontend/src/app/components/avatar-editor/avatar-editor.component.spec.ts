import { ComponentFixture, TestBed } from '@angular/core/testing'
import type { UserType } from '../../api/api.types'
import { AvatarEditorComponent } from './avatar-editor.component'

describe('AvatarEditorComponent', () => {
    let fixture: ComponentFixture<AvatarEditorComponent>
    let component: AvatarEditorComponent
    let saved: Array<UserType['avatar']>

    const avatar: UserType['avatar'] = { backgroundColor: '#EF4444', iconName: null, emoji: '📱', type: 'emoji', initials: '' }

    const preview = (): string => (fixture.nativeElement.querySelector('app-image-profile') as HTMLElement).textContent?.trim() ?? ''

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [AvatarEditorComponent] }).compileComponents()

        fixture = TestBed.createComponent(AvatarEditorComponent)
        component = fixture.componentInstance
        fixture.componentRef.setInput('avatar', avatar)
        saved = []
        component.configChange.subscribe((value) => saved.push(value))
        fixture.detectChanges()
    })

    it('updates the preview without changing the avatar it was given', () => {
        const buttons = [...fixture.nativeElement.querySelectorAll('button')] as Array<HTMLButtonElement>
        buttons.find((button) => button.textContent?.trim() === '😎')?.click()
        fixture.detectChanges()

        expect(preview()).toBe('😎')
        expect(saved).toEqual([{ ...avatar, emoji: '😎' }])
        expect(avatar.emoji).toBe('📱')
    })

    it('reports every change to the initials, even emptied, so the caller’s copy always matches the preview (#242)', () => {
        const initials = { backgroundColor: '#EF4444', iconName: null, emoji: null, type: 'initials' as const }

        component.setInitials('bl')
        component.setInitials('')

        expect(saved).toEqual([
            { ...initials, initials: 'BL' },
            { ...initials, initials: '' },
        ])
        expect(avatar.type).toBe('emoji')
    })
})
