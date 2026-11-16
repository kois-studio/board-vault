import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import { DataService } from '../../../core/services/data.service'
import { ToastService } from '../../toast/toast.service'
import { FormGameSubmissionComponent } from './form-game-submission.component'

describe('FormGameSubmissionComponent', () => {
    const setup = () => {
        const createGameProposal = vi.fn().mockReturnValue(of({}))
        const browseGamesNotOwnedByUser = vi.fn().mockReturnValue(of({ games: [], pagination: {} }))
        const refreshUserProposals = vi.fn()
        const toast = { success: vi.fn(), error: vi.fn() }
        const refreshUserProposalStats = vi.fn()
        TestBed.configureTestingModule({
            imports: [FormGameSubmissionComponent],
            providers: [
                { provide: Api, useValue: { createGameProposal, browseGamesNotOwnedByUser } },
                provideRouter([]),
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 2 }),
                        userGames: signal([]),
                        use: vi.fn(),
                        refreshUserProposals,
                        refreshUserProposalStats,
                    },
                },
                { provide: ToastService, useValue: toast },
            ],
        })
        const fixture = TestBed.createComponent(FormGameSubmissionComponent)
        const component = fixture.componentInstance
        return { fixture, component, toast, createGameProposal, browseGamesNotOwnedByUser, refreshUserProposals, refreshUserProposalStats }
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

    // #325: the proposer gives the title, notes, and where it goes; the admin fills in the rest at review.
    it("sends the title in the page's language, trimmed notes, and nothing an admin fills in", async () => {
        const { component, createGameProposal } = setup()

        component.gameSubmissionForm.patchValue({ title: ' Terraforming Mars ', notes: '  Stronghold Games, 2016  ' })
        await component.onSubmit()

        expect(createGameProposal.mock.calls[0]?.[1]).toEqual({
            title: 'Terraforming Mars',
            titleLanguage: 'en',
            notes: 'Stronghold Games, 2016',
            addTo: 'shelf',
        })
    })

    it('sends no notes when they are blank, and starts over after sending', async () => {
        const { component, createGameProposal } = setup()

        component.gameSubmissionForm.patchValue({ title: 'Azul', notes: '   ', addTo: 'wishlist' })
        await component.onSubmit()

        expect(createGameProposal.mock.calls[0]?.[1]).not.toHaveProperty('notes')
        expect(component.gameSubmissionForm.getRawValue()).toEqual({ title: null, notes: null, addTo: 'shelf' })
    })

    it('shows what is missing instead of sending without a title', async () => {
        const { component, createGameProposal } = setup()

        await component.onSubmit()

        expect(createGameProposal).not.toHaveBeenCalled()
        expect(component.title.touched).toBe(true)
        expect(component.title.errors?.['required']).toBe(true)
    })

    it('tells the page where the approved game goes', async () => {
        const { component } = setup()
        const sent: Array<string> = []
        component.proposalSubmitted.subscribe((addTo) => sent.push(addTo))

        component.gameSubmissionForm.patchValue({ title: 'Cascadia', addTo: 'wishlist' })
        await component.onSubmit()

        expect(sent).toEqual(['wishlist'])
    })

    it('toasts the send unless the page says thank you itself', async () => {
        const { component, toast } = setup()
        component.gameSubmissionForm.patchValue({ title: 'Azul' })
        await component.onSubmit()
        expect(toast.success).toHaveBeenCalledOnce()

        TestBed.resetTestingModule()
        const quiet = setup()
        quiet.fixture.componentRef.setInput('confirmWithToast', false)
        quiet.component.gameSubmissionForm.patchValue({ title: 'Azul' })
        await quiet.component.onSubmit()
        expect(quiet.toast.success).not.toHaveBeenCalled()
    })

    // #345: the game may already be in Board Vault; the form says so while typing, and when the API refuses it.
    describe('already in Board Vault', () => {
        const catan = { id: 9, title: 'Catan', imageUrl: '', gameAvgDuration: 60, minPlayers: 3, maxPlayers: 4 }

        it('shows the catalogue games matching the title as it is typed, not before two letters', async () => {
            vi.useFakeTimers()
            try {
                const { fixture, component, browseGamesNotOwnedByUser } = setup()
                browseGamesNotOwnedByUser.mockReturnValue(of({ games: [catan], pagination: {} }))
                fixture.detectChanges()

                component.title.setValue('C')
                await vi.advanceTimersByTimeAsync(400)
                expect(browseGamesNotOwnedByUser).not.toHaveBeenCalled()

                component.title.setValue('Catan')
                await vi.advanceTimersByTimeAsync(400)
                fixture.detectChanges()

                expect(browseGamesNotOwnedByUser).toHaveBeenCalledWith(2, 'Catan', 1, 3, expect.objectContaining({ hideOwned: false }))
                const element = fixture.nativeElement as HTMLElement
                expect(element.textContent).toContain('Already in Board Vault?')
                expect(element.querySelector('a[href="/games/9"]')).not.toBeNull()
            } finally {
                vi.useRealTimers()
            }
        })

        it('says the game is already in Board Vault, with a link to it, when the API refuses the title', async () => {
            const { fixture, component, createGameProposal, toast } = setup()
            createGameProposal.mockReturnValue(
                throwError(
                    () =>
                        new HttpErrorResponse({
                            status: 409,
                            error: { code: 'GAME_ALREADY_IN_CATALOGUE', message: 'already', context: { gameId: 9, gameTitle: 'Catan' } },
                        }),
                ),
            )
            component.gameSubmissionForm.patchValue({ title: 'catan' })

            await component.onSubmit()
            fixture.detectChanges()

            expect(component.alreadyInCatalogue()).toEqual({ gameId: 9, gameTitle: 'Catan' })
            expect(toast.error).not.toHaveBeenCalled()
            const element = fixture.nativeElement as HTMLElement
            expect(element.textContent).toContain('Catan is already in Board Vault.')
            expect(element.querySelector('a[href="/games/9"]')).not.toBeNull()
        })
    })

    it('puts Cancel next to Submit, back where the form was opened from', () => {
        const { fixture } = setup()
        fixture.componentRef.setInput('cancelLink', { path: '/submissions' })
        fixture.detectChanges()

        const cancel = [...(fixture.nativeElement as HTMLElement).querySelectorAll('a')].find(
            (link) => link.textContent?.trim() === 'Cancel',
        )
        expect(cancel?.getAttribute('href')).toBe('/submissions')
    })
})
