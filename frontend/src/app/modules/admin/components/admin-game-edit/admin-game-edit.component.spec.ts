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
        retailPrice: null,
    }
    let api: Record<string, ReturnType<typeof vi.fn>>
    let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }

    const render = async (game: AdminGameType = catan) => {
        api = {
            getAdminGame: vi.fn().mockReturnValue(of(game)),
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

        // A price typed with too many decimals is sent to the cent.
        component.form.patchValue({ imageUrl: 'https://example.test/catan.jpg', titleEs: 'Los colonos de Catán', retailPrice: 44.949 })
        component.selectedTagIds.set(new Set([4, 5]))
        await component.save()

        expect(api['updateAdminGame']).toHaveBeenCalledWith(2, {
            translations: { en: 'Catan', es: 'Los colonos de Catán' },
            imageUrl: 'https://example.test/catan.jpg',
            minPlayers: 3,
            maxPlayers: 4,
            gameAvgDuration: 90,
            retailPrice: 44.95,
            tagIds: [4, 5],
        })
        expect(toast.success).toHaveBeenCalledWith('Saved.')
    })

    it('says why Save is off when a price, a number or a title is out of range', async () => {
        const fixture = await render()
        const component = fixture.componentInstance
        const element = fixture.nativeElement as HTMLElement
        const priceHint = () => element.querySelector('#retailPrice-hint')

        component.form.patchValue({ retailPrice: 9999 })
        fixture.detectChanges()
        expect(element.querySelector('#retailPrice')?.getAttribute('aria-invalid')).toBe('true')
        expect(priceHint()?.textContent).toContain('The price goes from €0 to €5,000')
        expect(priceHint()?.classList).toContain('text-bv-danger')

        component.form.patchValue({ retailPrice: 45, maxPlayers: 120 })
        fixture.detectChanges()
        expect(priceHint()?.textContent).toContain('It only estimates what collections are worth')
        expect(element.textContent).toContain('Players go from 1 to 100, and the length from 1 to 1,440 minutes.')
        expect(element.textContent).not.toContain('are required')

        component.form.patchValue({ maxPlayers: 4 })
        const title = element.querySelector<HTMLInputElement>('#titleEn')
        const typeTitle = (value: string) => {
            if (!title) throw new Error('No English title field')
            title.value = value
            title.dispatchEvent(new Event('input'))
            title.dispatchEvent(new Event('blur'))
            fixture.detectChanges()
        }

        typeTitle('x'.repeat(201))
        expect(element.querySelector('#titleEn-error')?.textContent).toContain('Keep the title to 200 characters.')
        expect(title?.getAttribute('aria-describedby')).toBe('titleEn-error')

        typeTitle('')
        expect(element.querySelector('#titleEn-error')?.textContent).toContain('The English title is required.')
    })

    it('says at once when a game loads with a title that is too long, and puts range problems before missing values', async () => {
        const longTitle = 'x'.repeat(201)
        const fixture = await render({ ...catan, title: longTitle, translations: { en: longTitle, es: '' } })
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('#titleEn-error')?.textContent).toContain('Keep the title to 200 characters.')

        fixture.componentInstance.form.patchValue({ minPlayers: 0, gameAvgDuration: null })
        fixture.detectChanges()
        expect(element.textContent).toContain('Players go from 1 to 100')
        expect(element.textContent).not.toContain('are required')
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
