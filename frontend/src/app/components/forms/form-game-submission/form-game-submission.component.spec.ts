import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { FormGameSubmissionComponent } from './form-game-submission.component'

describe('FormGameSubmissionComponent', () => {
    const setup = () => {
        const createGameProposal = vi.fn().mockReturnValue(of({}))
        TestBed.configureTestingModule({
            imports: [FormGameSubmissionComponent],
            providers: [
                { provide: Api, useValue: { createGameProposal } },
                { provide: DataService, useValue: { currentUser: signal({ id: 2 }) } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        })
        const component = TestBed.createComponent(FormGameSubmissionComponent).componentInstance
        return { component, createGameProposal }
    }

    it('asks for the approved game on your shelf by default', async () => {
        const { component, createGameProposal } = setup()
        component.gameSubmissionForm.patchValue({ title: 'Azul' })

        await component.onSubmit()

        expect(createGameProposal).toHaveBeenCalledWith(2, expect.objectContaining({ title: 'Azul', addTo: 'shelf' }))
        expect(component.gameSubmissionForm.controls.addTo.value).toBe('shelf')
    })

    it('sends the wishlist choice, and nothing for neither', async () => {
        const { component, createGameProposal } = setup()

        component.gameSubmissionForm.patchValue({ title: 'Cascadia', addTo: 'wishlist' })
        await component.onSubmit()
        component.gameSubmissionForm.patchValue({ title: 'Patchwork', addTo: 'none' })
        await component.onSubmit()

        expect(createGameProposal.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ addTo: 'wishlist' }))
        expect(createGameProposal.mock.calls[1]?.[1]).not.toHaveProperty('addTo')
    })
})
