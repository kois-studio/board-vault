import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../../api/api'
import type { AdminGameType, UserType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'
import { LogService } from '../../../../core/services/log.service'
import { AdminGamesManageComponent } from './admin-games-manage.component'

describe('AdminGamesManageComponent', () => {
    const hanabi: AdminGameType = {
        id: 3,
        title: 'Hanabi',
        imageUrl: '',
        gameAvgDuration: 25,
        minPlayers: 2,
        maxPlayers: 5,
        translations: { en: 'Hanabi', es: '' },
        tags: [],
        issues: ['no-artwork', 'no-spanish', 'no-tags'],
        artworkSource: null,
    }
    let getAdminGames: ReturnType<typeof vi.fn>

    const render = () => {
        getAdminGames = vi
            .fn()
            .mockReturnValue(of({ games: [hanabi], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 } }))
        TestBed.configureTestingModule({
            imports: [AdminGamesManageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getAdminGames, getCatalogueTags: vi.fn().mockReturnValue(of([])) } },
                { provide: DataService, useValue: { currentUser: signal({ id: 1 } as UserType) } },
                { provide: LogService, useValue: { error: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(AdminGamesManageComponent)
        fixture.detectChanges()
        return fixture
    }

    it('lists the catalogue on arrival, with each title, a link to edit it, and its problems', async () => {
        const fixture = render()
        await fixture.whenStable()
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement
        const row = element.querySelector('a[href="/admin/manage-games/3"]') as HTMLAnchorElement

        expect(getAdminGames).toHaveBeenCalledWith({}, 1, 20)
        expect(row.textContent).toContain('Hanabi')
        expect(row.textContent).toContain('No artwork')
        expect(row.textContent).toContain('No tags')
        expect(element.textContent).not.toContain('undefined')
    })

    it('filters by a data problem and by length, and toggles a length off again', async () => {
        const fixture = render()
        const component = fixture.componentInstance

        component.setIssue('no-tags')
        expect(getAdminGames).toHaveBeenLastCalledWith({ issue: 'no-tags' }, 1, 20)

        component.setLength('short')
        expect(getAdminGames).toHaveBeenLastCalledWith({ issue: 'no-tags', length: 'short' }, 1, 20)

        component.setLength('short')
        expect(getAdminGames).toHaveBeenLastCalledWith({ issue: 'no-tags', length: undefined }, 1, 20)

        component.clearFilters()
        expect(getAdminGames).toHaveBeenLastCalledWith({}, 1, 20)
    })
})
