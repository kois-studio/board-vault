import { Location } from '@angular/common'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { AccountPendingService } from '../../core/services/account-pending.service'
import { DataService } from '../../core/services/data.service'
import { HOME_LISTS } from '../../pages/dashboard-page/home-lists'
import { AccountPendingComponent } from './account-pending.component'

// #343: on the way to Home, one loading screen in Home's shape, and Home's lists asked for as soon as possible.
describe('AccountPendingComponent', () => {
    function render(path: string) {
        const dataService = { use: vi.fn() }
        TestBed.configureTestingModule({
            imports: [AccountPendingComponent],
            providers: [
                { provide: Location, useValue: { path: () => path } },
                { provide: AccountPendingService, useValue: { showsHandoffCard: signal(false) } },
                { provide: DataService, useValue: dataService },
            ],
        })
        const fixture = TestBed.createComponent(AccountPendingComponent)
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, dataService }
    }

    it('shows Home’s skeleton, greeting and buttons included, and names Home’s lists on the way to Home', () => {
        const { element, dataService } = render('/dashboard')

        expect(element.querySelector('[data-testid="home-header-skeleton"]')).not.toBeNull()
        expect(element.querySelector('[data-testid="home-body-skeleton"]')).not.toBeNull()
        expect(element.querySelector('[data-testid="page-skeleton"]')).toBeNull()
        expect(dataService.use).toHaveBeenCalledWith(HOME_LISTS)
    })

    it('shows the page skeleton, and names nothing, on the way to any other page', () => {
        const { element, dataService } = render('/collection/games?x=1')

        expect(element.querySelector('[data-testid="page-skeleton"]')).not.toBeNull()
        expect(element.querySelector('[data-testid="home-header-skeleton"]')).toBeNull()
        expect(dataService.use).not.toHaveBeenCalled()
    })
})
