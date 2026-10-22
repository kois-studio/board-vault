import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { HomePreferences } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from './data.service'
import { HomePreferencesService } from './home-preferences.service'

const empty: HomePreferences = { pinnedGroupIds: [], groupOrder: 'recent', dismissedRatingGameIds: [] }

function setup() {
    const user = signal<{ id: number } | null>({ id: 1 })
    const api = {
        getHomePreferences: vi.fn().mockReturnValue(of(empty)),
        saveHomePreferences: vi.fn().mockImplementation((value) => of(value)),
    }
    const toast = { error: vi.fn() }
    TestBed.configureTestingModule({
        providers: [
            { provide: Api, useValue: api },
            { provide: DataService, useValue: { currentUser: user } },
            { provide: ToastService, useValue: toast },
        ],
    })
    const home = TestBed.inject(HomePreferencesService)
    TestBed.tick()
    return { home, api, user, toast }
}

describe('personal Home preferences', () => {
    it('pins in the order chosen, unpins, and restores preferences after a failed save', async () => {
        const { home, api, toast } = setup()
        home.togglePin(10)
        await Promise.resolve()
        home.togglePin(20)
        await Promise.resolve()
        expect(home.preferences().pinnedGroupIds).toEqual([10, 20])
        home.togglePin(10)
        await Promise.resolve()
        expect(home.preferences().pinnedGroupIds).toEqual([20])
        api.saveHomePreferences.mockReturnValueOnce(throwError(() => new Error('offline')))
        await home.update({ pinnedGroupIds: [] })
        expect(home.preferences().pinnedGroupIds).toEqual([20])
        expect(toast.error).toHaveBeenCalled()
    })

    it('drops pending loads and saves on sign-out before another account uses Home', async () => {
        const { home, api, user } = setup()
        const save = new Subject<HomePreferences>()
        api.saveHomePreferences.mockReturnValueOnce(save)
        const saving = home.update({ pinnedGroupIds: [99] })
        user.set(null)
        TestBed.tick()
        user.set({ id: 2 })
        TestBed.tick()
        save.next({ ...empty, pinnedGroupIds: [99] })
        await saving
        expect(home.preferences()).toEqual(empty)
        expect(home.saving()).toBe(false)
    })
})
