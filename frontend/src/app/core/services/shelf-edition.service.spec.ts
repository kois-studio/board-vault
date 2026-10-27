import { TestBed } from '@angular/core/testing'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { Api } from '../../api/api'
import type { GameEditionType } from '../../api/api.types'
import { ShelfEditionService } from './shelf-edition.service'

describe('ShelfEditionService', () => {
    const codenames: Array<GameEditionType> = [
        { id: 1, languageCode: 'en', title: 'Codenames', isPrimary: true },
        { id: 2, languageCode: 'es', title: 'Código Secreto', isPrimary: false },
    ]

    const setup = (editions: Array<GameEditionType>) => {
        const api = {
            getGameEditions: vi.fn().mockReturnValue(of(editions)),
            addGameToUserCollection: vi.fn().mockReturnValue(of({ success: true })),
            setOwnedEdition: vi.fn().mockReturnValue(of({ success: true })),
        }
        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] })
        return { api, service: TestBed.inject(ShelfEditionService) }
    }

    it('adds a game with one edition without asking', async () => {
        const { api, service } = setup(codenames.slice(0, 1))

        await expect(service.addToShelf(7, { id: 3 }, 'Codenames')).resolves.toBe(true)

        expect(service.question()).toBeNull()
        expect(api.addGameToUserCollection).toHaveBeenCalledWith(7, 3, null)
    })

    it('asks which of several editions, starting on the page language, and adds the one chosen', async () => {
        const { api, service } = setup(codenames)
        const added = service.addToShelf(7, { id: 3 }, 'Codenames')

        await vi.waitFor(() => expect(service.question()).not.toBeNull())
        // Unit tests run in English: the English edition is preselected.
        expect(service.question()).toMatchObject({ mode: 'add', selectedId: 1, gameTitle: 'Codenames' })
        service.question()?.answer({ editionId: 2 })

        await expect(added).resolves.toBe(true)
        expect(api.addGameToUserCollection).toHaveBeenCalledWith(7, 3, 2)
        expect(service.question()).toBeNull()
    })

    it('adds nothing when the question is cancelled', async () => {
        const { api, service } = setup(codenames)
        const added = service.addToShelf(7, { id: 3 }, 'Codenames')

        await vi.waitFor(() => expect(service.question()).not.toBeNull())
        service.question()?.answer(null)

        await expect(added).resolves.toBe(false)
        expect(api.addGameToUserCollection).not.toHaveBeenCalled()
    })

    it('uses the editions a page already has instead of asking the API', async () => {
        const { api, service } = setup([])
        const added = service.addToShelf(7, { id: 3 }, 'Codenames', codenames)

        await vi.waitFor(() => expect(service.question()).not.toBeNull())
        service.question()?.answer({ editionId: null })

        await expect(added).resolves.toBe(true)
        expect(api.getGameEditions).not.toHaveBeenCalled()
        expect(api.addGameToUserCollection).toHaveBeenCalledWith(7, 3, null)
    })

    it('starts a change on the current edition, saves it, and clears it with null', async () => {
        const { api, service } = setup(codenames)
        const changed = service.changeEdition(7, { id: 3 }, 'Codenames', codenames, 2)

        expect(service.question()).toMatchObject({ mode: 'change', selectedId: 2 })
        service.question()?.answer({ editionId: null })

        await expect(changed).resolves.toBeNull()
        expect(api.setOwnedEdition).toHaveBeenCalledWith(7, 3, null)

        const cancelled = service.changeEdition(7, { id: 3 }, 'Codenames', codenames, null)

        expect(service.question()).toMatchObject({ selectedId: 1 })
        service.question()?.answer(null)
        await expect(cancelled).resolves.toBeUndefined()
        expect(api.setOwnedEdition).toHaveBeenCalledTimes(1)
    })
})
