import { Component, signal, ViewChild } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Api } from '../../../api/api'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { ModalGameSubmissionComponent } from './modal-game-submission.component'

@Component({
    imports: [ModalGameSubmissionComponent],
    template: `
        <button type="button" (click)="modal.showDialog()">Submit Your First Game</button>
        <app-modal-game-submission />
    `,
})
class SubmissionsHostComponent {
    @ViewChild(ModalGameSubmissionComponent) modal!: ModalGameSubmissionComponent
}

describe('ModalGameSubmissionComponent', () => {
    let fixture: ComponentFixture<SubmissionsHostComponent>

    const root = () => fixture.nativeElement as HTMLElement
    const panel = () => root().querySelector('[role="dialog"]') as HTMLElement | null
    const openPanel = () => panel() as HTMLElement
    const open = () => {
        ;(root().querySelector('button') as HTMLButtonElement).click()
        fixture.detectChanges()
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SubmissionsHostComponent],
            providers: [
                { provide: Api, useValue: { createGameProposal: vi.fn() } },
                { provide: DataService, useValue: { currentUser: signal({ id: 1 }) } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(SubmissionsHostComponent)
        fixture.detectChanges()
    })

    it('opens the proposal form in a panel that sits inside a translucent backdrop', () => {
        expect(panel()).toBeNull()

        open()

        const dialog = panel() as HTMLElement
        const backdrop = dialog.parentElement as HTMLElement
        // The panel must be a child of the fixed backdrop: as a sibling it was painted underneath it.
        expect(backdrop.classList).toContain('fixed')
        expect(backdrop.classList).toContain('bg-black/50')
        expect(backdrop.className).not.toMatch(/bg-opacity-/)
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title')
        expect(dialog.querySelector('#modal-title')?.textContent).toContain('Submit Game Proposal')
        expect(dialog.querySelector('form-game-submission #title')).not.toBeNull()
    })

    it('closes from the backdrop and the close button, but not from a click inside the form', () => {
        open()
        ;(openPanel().querySelector('#title') as HTMLInputElement).click()
        fixture.detectChanges()
        expect(panel()).not.toBeNull()

        ;(openPanel().parentElement as HTMLElement).click()
        fixture.detectChanges()
        expect(panel()).toBeNull()

        open()
        ;([...openPanel().querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Close') as HTMLButtonElement).click()
        fixture.detectChanges()
        expect(panel()).toBeNull()
    })
})
