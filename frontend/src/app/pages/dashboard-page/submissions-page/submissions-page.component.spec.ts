import { Component, output, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { ModalGameSubmissionComponent } from '../../../components/modals/modal-game-submission/modal-game-submission.component'
import type { ResourceStatus } from '../../../core/async/resource-state'
import { withStates } from '../../../core/async/resource-state.testing'
import { DataService } from '../../../core/services/data.service'
import { SubmissionsPageComponent } from './submissions-page.component'

@Component({ selector: 'app-modal-game-submission', template: '' })
class ModalStubComponent {
    readonly proposalSubmitted = output<void>()
}

const stats = { totalProposals: 4, approvedProposals: 2, rejectedProposals: 1, reputationScore: 9 }

async function render(statuses: Record<string, ResourceStatus> = {}) {
    await TestBed.configureTestingModule({
        imports: [SubmissionsPageComponent],
        providers: [
            provideRouter([]),
            {
                provide: DataService,
                useValue: withStates(
                    {
                        currentUser: signal({ id: 1 }),
                        userProposals: signal([]),
                        userProposalStats: signal(stats),
                        refreshUserProposals: vi.fn(),
                    },
                    statuses,
                ),
            },
        ],
    })
        .overrideComponent(SubmissionsPageComponent, {
            remove: { imports: [ModalGameSubmissionComponent] },
            add: { imports: [ModalStubComponent] },
        })
        .compileComponents()
    const fixture = TestBed.createComponent(SubmissionsPageComponent)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
}

// #261: your proposals and their numbers hold their place while they load, and never say "No proposals yet" then.
describe('SubmissionsPageComponent while it loads', () => {
    it('holds the numbers and the list in their shape', async () => {
        const element = await render({ userProposals: 'loading', userProposalStats: 'loading' })

        expect(element.querySelectorAll('[data-testid="stat-skeleton"]')).toHaveLength(4)
        expect(element.querySelector('[data-testid="proposals-skeleton"]')).not.toBeNull()
        expect(element.textContent).toContain('Loading your proposals…')
        // One label for the four numbers, not one per number.
        expect(element.querySelectorAll('[role="status"]')).toHaveLength(2)
        expect(element.textContent).toContain('Loading your submission stats…')
        expect(element.textContent).not.toContain('No proposals yet')
    })

    it('shows the numbers once they load, and a dash when they failed', async () => {
        const loaded = await render()
        expect(loaded.querySelector('[data-testid="stat-skeleton"]')).toBeNull()
        const numbers = [...loaded.querySelectorAll('.grid .text-2xl')].map((number) => number.textContent?.trim())
        expect(numbers).toEqual(['4', '2', '1', '9'])
        expect(loaded.textContent).toContain('No proposals yet')

        TestBed.resetTestingModule()
        const failed = await render({ userProposalStats: 'error' })
        expect(failed.querySelector('[data-testid="stat-skeleton"]')).toBeNull()
        expect([...failed.querySelectorAll('.grid .text-2xl')].map((number) => number.textContent?.trim())).toEqual(['—', '—', '—', '—'])
    })

    it('does not say there are no proposals when they could not be loaded', async () => {
        const element = await render({ userProposals: 'error' })

        expect(element.textContent).toContain('Submission data could not be loaded.')
        expect(element.textContent).not.toContain('No proposals yet')
    })
})
