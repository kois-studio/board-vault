import { HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { LogService } from '../../../../core/services/log.service'
import { AdminGamesManageService } from '../admin-games-manage/admin-games-manage.service'
import { AdminGameEditComponent } from './admin-game-edit.component'

describe('AdminGameEditComponent', () => {
    const catan: AdminGameType = {
        id: 2,
        title: 'Catan',
        imageUrl: '',
        gameAvgDuration: 90,
        minPlayers: 3,
        maxPlayers: 4,
        translations: { en: 'Catan', es: 'Catan' },
        tags: [{ id: 4, name: 'Strategy', categoryName: 'Genre' }],
        issues: ['no-artwork', 'no-spanish'],
    }
    let api: Record<string, ReturnType<typeof vi.fn>>
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }

    const render = async () => {
        api = {
            getAdminGame: vi.fn().mockReturnValue(of(catan)),
            getAdminTags: vi.fn().mockReturnValue(
                of([
                    { id: 4, name: 'Strategy', categoryId: 1, gameCount: 1 },
                    { id: 5, name: 'Trading', categoryId: 1, gameCount: 0 },
                ]),
            ),
            getAdminTagCategories: vi.fn().mockReturnValue(of([{ id: 1, name: 'Genre', tags: [4, 5], gameCount: 1 }])),
            updateAdminGame: vi.fn().mockReturnValue(of({ ...catan, imageUrl: 'https://example.test/catan.jpg', issues: ['no-spanish'] })),
        }
        toast = { success: vi.fn(), error: vi.fn() }
        TestBed.configureTestingModule({
            imports: [AdminGameEditComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '2' }) } } },
                { provide: Api, useValue: api },
                { provide: ToastService, useValue: toast },
                { provide: LogService, useValue: { error: vi.fn() } },
                { provide: AdminGamesManageService, useValue: { load: vi.fn(), filters: () => ({}), page: () => 1 } },
            ],
        })
        const fixture = TestBed.createComponent(AdminGameEditComponent)
        await fixture.componentInstance.ngOnInit()
        fixture.detectChanges()
        return fixture
    }

    it('shows the game’s values and problems, and saves every field in one request', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('No artwork')
        expect(component.form.getRawValue()).toEqual(
            expect.objectContaining({ titleEn: 'Catan', titleEs: 'Catan', minPlayers: 3, maxPlayers: 4, gameAvgDuration: 90 }),
        )

        component.form.patchValue({ imageUrl: 'https://example.test/catan.jpg', titleEs: 'Los colonos de Catán' })
        component.selectedTagIds.set(new Set([4, 5]))
        await component.save()

        expect(api['updateAdminGame']).toHaveBeenCalledWith(2, {
            translations: { en: 'Catan', es: 'Los colonos de Catán' },
            imageUrl: 'https://example.test/catan.jpg',
            minPlayers: 3,
            maxPlayers: 4,
            gameAvgDuration: 90,
            tagIds: [4, 5],
        })
        expect(toast.success).toHaveBeenCalledWith('Saved.')
    })

    it('does not save more minimum than maximum players, and shows the server’s reason for a 400', async () => {
        const fixture = await render()
        const component = fixture.componentInstance

        component.form.patchValue({ minPlayers: 6 })
        await component.save()
        expect(api['updateAdminGame']).not.toHaveBeenCalled()

        component.form.patchValue({ minPlayers: 3 })
        api['updateAdminGame']?.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'Unknown tag ids: 9.' } })),
        )
        await component.save()
        expect(toast.error).toHaveBeenCalledWith('Unknown tag ids: 9.')
    })
})
