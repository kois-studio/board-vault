import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { FormGameSubmissionComponent } from './form-game-submission.component'

describe('FormGameSubmissionComponent', () => {
    const firstKey = (component: FormGameSubmissionComponent) => component.otherTitles()[0]?.key ?? -1

    const setup = () => {
        const createGameProposal = vi.fn().mockReturnValue(of({}))
        const refreshUserProposals = vi.fn()
        const refreshUserProposalStats = vi.fn()
        TestBed.configureTestingModule({
            imports: [FormGameSubmissionComponent],
            providers: [
                { provide: Api, useValue: { createGameProposal } },
                { provide: DataService, useValue: { currentUser: signal({ id: 2 }), refreshUserProposals, refreshUserProposalStats } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        })
        const component = TestBed.createComponent(FormGameSubmissionComponent).componentInstance
        return { component, createGameProposal, refreshUserProposals, refreshUserProposalStats }
    }

    // #326: the propose page and the My submissions dialog both send through this form, so it reloads
    // your proposals and their numbers itself; the avatar menu's count and My submissions include the new one.
    it('reloads your proposals and their numbers after sending one', async () => {
        const { component, refreshUserProposals, refreshUserProposalStats } = setup()
        component.gameSubmissionForm.patchValue({ title: 'Terraforming Mars' })

        await component.onSubmit()

        expect(refreshUserProposals).toHaveBeenCalledOnce()
        expect(refreshUserProposalStats).toHaveBeenCalledOnce()
    })

    it('reloads nothing when sending fails', async () => {
        const { component, createGameProposal, refreshUserProposals, refreshUserProposalStats } = setup()
        createGameProposal.mockReturnValue(throwError(() => new Error('offline')))
        component.gameSubmissionForm.patchValue({ title: 'Terraforming Mars' })

        await component.onSubmit()

        expect(refreshUserProposals).not.toHaveBeenCalled()
        expect(refreshUserProposalStats).not.toHaveBeenCalled()
    })

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

    it("sends the title's language (the page's by default) and the other titles, leaving blank rows out", async () => {
        const { component, createGameProposal } = setup()

        component.gameSubmissionForm.patchValue({ title: 'Azul' })
        await component.onSubmit()
        expect(createGameProposal.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ titleLanguage: 'en' }))
        expect(createGameProposal.mock.calls[0]?.[1]).not.toHaveProperty('otherTitles')

        component.gameSubmissionForm.patchValue({ title: 'Die Siedler von Catan' })
        component.titleLanguage.set('de')
        component.addTitle()
        component.addTitle()
        const [first, blank] = component.otherTitles()
        component.setTitleText(first?.key ?? -1, ' Catan ')
        component.setTitleLanguage(first?.key ?? -1, 'pt-br')
        expect(blank?.title).toBe('')
        await component.onSubmit()

        expect(createGameProposal.mock.calls[1]?.[1]).toEqual(
            expect.objectContaining({ titleLanguage: 'de', otherTitles: [{ languageCode: 'pt-BR', title: 'Catan' }] }),
        )
        // The form starts over after sending.
        expect(component.otherTitles()).toEqual([])
        expect(component.titleLanguage()).toBe('en')
    })

    it('will not send two titles in one language, or one in the title language', async () => {
        const { component, createGameProposal } = setup()

        component.gameSubmissionForm.patchValue({ title: 'Azul' })
        component.addTitle()
        component.setTitleText(firstKey(component), 'Azul')
        component.setTitleLanguage(firstKey(component), 'en')
        expect(component.titleProblem()).toBe('duplicate')
        await component.onSubmit()

        component.setTitleLanguage(firstKey(component), '')
        expect(component.titleProblem()).toBe('language')
        await component.onSubmit()

        component.removeTitle(firstKey(component))
        expect(component.titleProblem()).toBeNull()
        expect(createGameProposal).not.toHaveBeenCalled()
    })
})
