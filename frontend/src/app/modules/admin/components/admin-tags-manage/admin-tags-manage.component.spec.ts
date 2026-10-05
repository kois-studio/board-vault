import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { Api } from '../../../../api/api'
import { ToastService } from '../../../../components/toast/toast.service'
import { LogService } from '../../../../core/services/log.service'
import { AdminTagsManageComponent } from './admin-tags-manage.component'

describe('AdminTagsManageComponent', () => {
    let api: Record<string, ReturnType<typeof vi.fn>>
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }

    const render = async () => {
        api = {
            getAdminTagCategories: vi.fn().mockReturnValue(
                of([
                    { id: 2, name: 'Players', tags: [2, 3], gameCount: 3 },
                    { id: 1, name: 'Genre', tags: [1], gameCount: 1 },
                ]),
            ),
            getAdminTags: vi.fn().mockReturnValue(
                of([
                    { id: 1, name: 'Abstract', categoryId: 1, gameCount: 1 },
                    { id: 2, name: 'Two-Player', categoryId: 2, gameCount: 2 },
                    { id: 3, name: '2 players', categoryId: 2, gameCount: 0 },
                ]),
            ),
            mergeAdminTag: vi.fn().mockReturnValue(of({ gamesMoved: 2 })),
        }
        toast = { success: vi.fn(), error: vi.fn() }
        TestBed.configureTestingModule({
            imports: [AdminTagsManageComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: ToastService, useValue: toast },
                { provide: LogService, useValue: { log: vi.fn(), error: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(AdminTagsManageComponent)
        await fixture.componentInstance.ngOnInit()
        fixture.detectChanges()
        return fixture
    }

    it('shows categories as sections with their tags, and searches tags by name', async () => {
        const fixture = await render()
        const component = fixture.componentInstance

        expect(component.sections().map((section) => [section.category.name, section.tags.map((tag) => tag.name)])).toEqual([
            ['Genre', ['Abstract']],
            ['Players', ['2 players', 'Two-Player']],
        ])
        component.search.set('two')
        expect(component.sections().map((section) => section.category.name)).toEqual(['Players'])
    })

    it('says how many games a merge changes, then merges', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        const element = fixture.nativeElement as HTMLElement

        component.onMergeTag({ id: 2, name: 'Two-Player', categoryId: 2, gameCount: 2 })
        component.setMergeInto('3')
        fixture.detectChanges()

        expect(document.body.textContent ?? element.textContent).toContain('2 games have "Two-Player". They will have "2 players"')
        await component.confirmMerge()

        expect(api['mergeAdminTag']).toHaveBeenCalledWith(2, 3)
        expect(toast.success).toHaveBeenCalledWith('"Two-Player" merged into "2 players". 2 games gained it.')
        expect(component.mergingTag()).toBeNull()
    })
})
