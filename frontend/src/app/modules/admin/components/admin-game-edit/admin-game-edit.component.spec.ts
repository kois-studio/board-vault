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
        artworkSource: null,
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

    it('uploads a photo as the artwork at once, keeping the other unsaved edits', async () => {
        const fixture = await render()
        await fixture.whenStable()
        const component = fixture.componentInstance
        const stored = 'http://localhost:3000/artwork/2-0123456789abcdef.webp'
        api['uploadGameArtwork'] = vi.fn().mockReturnValue(of({ ...catan, imageUrl: stored, artworkSource: null, issues: ['no-spanish'] }))
        const photo = new File(['photo'], 'catan.jpg', { type: 'image/jpeg' })
        const input = { files: [photo], value: 'C:\\fakepath\\catan.jpg' } as unknown as HTMLInputElement

        component.form.patchValue({ titleEs: 'Los colonos de Catán' })
        await component.uploadArtwork(input)

        expect(api['uploadGameArtwork']).toHaveBeenCalledWith(2, photo)
        expect(component.form.getRawValue()).toEqual(expect.objectContaining({ imageUrl: stored, titleEs: 'Los colonos de Catán' }))
        expect(input.value).toBe('')
        expect(toast.success).toHaveBeenCalledWith('Artwork updated.')
    })

    it('refuses an image over 4 MB before sending it', async () => {
        const fixture = await render()
        api['uploadGameArtwork'] = vi.fn()
        const huge = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'scan.png', { type: 'image/png' })

        await fixture.componentInstance.uploadArtwork({ files: [huge], value: '' } as unknown as HTMLInputElement)

        expect(api['uploadGameArtwork']).not.toHaveBeenCalled()
        expect(toast.error).toHaveBeenCalledWith('Choose an image under 4 MB.')
    })
})
