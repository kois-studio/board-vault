import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameProposalType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { LogService } from '../../../../core/services/log.service'
import { PendingProposalsService } from '../../../../core/services/pending-proposals.service'
import { AdminProposalReviewComponent } from './admin-proposal-review.component'

describe('AdminProposalReviewComponent', () => {
    const proposal: AdminGameProposalType = {
        id: 12,
        submittedBy: 7,
        submitterId: 7,
        status: 'pending',
        title: 'Azul',
        imageUrl: null,
        gameAvgDuration: null,
        minPlayers: 2,
        maxPlayers: null,
        proposedTags: 'abstract, Family',
        notes: 'Tile drafting',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        createdGameId: null,
        submittedAt: '2026-10-01T10:00:00.000Z',
        addTo: 'shelf',
    }
    const azulInCatalogue = {
        id: 40,
        title: 'Azul',
        imageUrl: '',
        gameAvgDuration: 45,
        minPlayers: 2,
        maxPlayers: 4,
        translations: { en: 'Azul', es: 'Azul' },
        tags: [],
    }

    let api: Record<string, ReturnType<typeof vi.fn>>

    const render = async (value: AdminGameProposalType = proposal) => {
        api = {
            getAdminGameProposal: vi.fn().mockReturnValue(of(value)),
            getAdminTags: vi.fn().mockReturnValue(
                of([
                    { id: 1, name: 'Abstract', categoryId: 1, gameCount: 3 },
                    { id: 2, name: 'Family', categoryId: 2, gameCount: 5 },
                    { id: 3, name: 'Party', categoryId: 2, gameCount: 1 },
                ]),
            ),
            getAdminTagCategories: vi.fn().mockReturnValue(
                of([
                    { id: 1, name: 'Mechanics', tags: [1], gameCount: 3 },
                    { id: 2, name: 'Audience', tags: [2, 3], gameCount: 6 },
                ]),
            ),
            getAdminGames: vi
                .fn()
                .mockReturnValue(
                    of({ games: [azulInCatalogue], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 5 } }),
                ),
            approveGameProposal: vi.fn().mockReturnValue(of({ success: true, createdGameId: 41 })),
            rejectGameProposal: vi.fn().mockReturnValue(of({ success: true })),
            markGameProposalAsDuplicate: vi.fn().mockReturnValue(of({ success: true })),
        }
        TestBed.configureTestingModule({
            imports: [AdminProposalReviewComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '12' }) } } },
                { provide: Api, useValue: api },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
                { provide: LogService, useValue: { error: vi.fn() } },
                { provide: PendingProposalsService, useValue: { refresh: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(AdminProposalReviewComponent)
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
        await fixture.componentInstance.ngOnInit()
        // The duplicate lookup runs in the background.
        await new Promise((resolve) => setTimeout(resolve))
        fixture.detectChanges()
        return fixture
    }

    const pressed = (element: HTMLElement) =>
        [...element.querySelectorAll<HTMLButtonElement>('button.app-chip[aria-pressed="true"]')].map((chip) => chip.textContent?.trim())

    it('pre-selects the proposed tags that exist and lists possible duplicates', async () => {
        const fixture = await render()
        const element = fixture.nativeElement as HTMLElement

        expect(pressed(element)).toEqual(['Family', 'Abstract'])
        expect(element.textContent).toContain('Proposed: abstract, Family')
        expect(element.textContent).toContain("It's this one")
        expect(api['getAdminGames']).toHaveBeenCalledWith('Azul', 1, 5)
    })

    it('cannot approve until players and length are set, and then sends exactly the reviewed values', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        const approve = () => (fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement

        expect(approve().disabled).toBe(true)

        component.form.patchValue({ maxPlayers: 4, gameAvgDuration: 30, titleEs: 'Azul (ES)' })
        component.toggleTag(1)
        fixture.detectChanges()
        expect(approve().disabled).toBe(false)

        await component.approve()

        expect(api['approveGameProposal']).toHaveBeenCalledWith(12, {
            translations: { en: 'Azul', es: 'Azul (ES)' },
            imageUrl: '',
            minPlayers: 2,
            maxPlayers: 4,
            gameAvgDuration: 30,
            tagIds: [2],
            reviewNotes: undefined,
        })
    })

    it('refuses more minimum than maximum players', async () => {
        const fixture = await render()
        fixture.componentInstance.form.patchValue({ minPlayers: 5, maxPlayers: 4, gameAvgDuration: 30 })

        await fixture.componentInstance.approve()

        expect(api['approveGameProposal']).not.toHaveBeenCalled()
    })

    it('needs a reason to reject, and sends that reason', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        component.openReject()

        await component.confirmReject()
        expect(api['rejectGameProposal']).not.toHaveBeenCalled()

        component.useQuickReason('This is not a board game.')
        await component.confirmReject()
        expect(api['rejectGameProposal']).toHaveBeenCalledWith(12, { reviewNotes: 'This is not a board game.' })
    })

    it('marks a duplicate of the chosen catalogue game', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        component.openDuplicate(azulInCatalogue)
        component.duplicateNotes.setValue('Same game')

        await component.confirmDuplicate()

        expect(api['markGameProposalAsDuplicate']).toHaveBeenCalledWith(12, { duplicateOfGameId: 40, reviewNotes: 'Same game' })
    })

    it('shows a reviewed proposal read-only', async () => {
        const fixture = await render({
            ...proposal,
            status: 'rejected',
            reviewNotes: 'Not a board game',
            reviewedAt: '2026-10-02T10:00:00.000Z',
        })
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('button[type="submit"]')).toBeNull()
        expect(element.textContent).toContain('Not a board game')
        expect(fixture.componentInstance.form.disabled).toBe(true)
    })
})
