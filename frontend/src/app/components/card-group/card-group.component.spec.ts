import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import type { GroupWithMembersAndGames, MeetType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardGroupComponent } from './card-group.component'

describe('CardGroupComponent social entry surface', () => {
    let fixture: ComponentFixture<CardGroupComponent>
    const meet = (overrides: Partial<MeetType>): MeetType => ({
        id: 21,
        groupId: 7,
        createdBy: 1,
        meetDate: '2026-09-12T18:00:00.000Z',
        isConfirmed: true,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        ...overrides,
    })
    const userMeets = signal<Array<MeetType>>([])

    const group = {
        id: 7,
        name: 'Friday crew',
        createdBy: 1,
        createdAt: '2026-09-01T10:00:00.000Z',
        members: [
            {
                id: 1,
                username: 'owner',
                displayName: 'Group owner',
                avatar: { backgroundColor: '#fff', iconName: null, emoji: null, type: 'initials' as const, initials: 'GO' },
                joinedAt: '2026-09-01T10:00:00.000Z',
                games: [{ id: 11 }],
                reviews: [],
            },
            {
                id: 2,
                username: 'friend',
                displayName: 'Friend',
                avatar: { backgroundColor: '#000', iconName: null, emoji: null, type: 'initials' as const, initials: 'F' },
                joinedAt: '2026-09-02T10:00:00.000Z',
                games: [{ id: 12 }],
                reviews: [],
            },
        ],
    } as unknown as GroupWithMembersAndGames

    beforeEach(async () => {
        // Two days before the planned night, whenever the tests run.
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-09-10T10:00:00.000Z'))
        userMeets.set([meet({})])

        await TestBed.configureTestingModule({
            imports: [CardGroupComponent],
            providers: [
                { provide: ActivatedRoute, useValue: {} },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal(null),
                        userMeets,
                    },
                },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(CardGroupComponent)
        fixture.componentRef.setInput('group', group)
        fixture.componentRef.setInput('invitations', [])
        fixture.detectChanges()
    })

    afterEach(() => vi.useRealTimers())

    it('exposes explicit social actions instead of making the whole card one control', () => {
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelector('article')).not.toBeNull()
        expect(element.querySelector('article > button')).toBeNull()
        expect(element.textContent).toContain('Next session')
        expect(element.textContent).toContain('Open plan')
        expect(element.textContent).toContain('Decide what to play')
        expect(element.textContent).toContain('Plan session')

        const actionLinks = Array.from(element.querySelectorAll('footer a'))
        expect(actionLinks.map((link) => link.textContent?.trim())).toEqual(['Open workspace', 'Decide what to play', 'Plan session'])
    })

    it('deduplicates games across group members in the shared summary', () => {
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('2 shared games')
        expect(element.textContent).toContain('2 games available')
    })

    it('shows a game night in progress as happening now, not as the next session', () => {
        userMeets.set([meet({ id: 22, status: 'active', meetDate: '2026-09-08T17:00:00.000Z' }), meet({})])
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('Happening now')
        expect(element.querySelector('a[href="/sessions/22"]')?.textContent?.trim()).toBe('Open game night')
        expect(element.textContent).not.toContain('Next session')
    })

    it('does not offer a planned night whose evening is long over as next', () => {
        userMeets.set([meet({ meetDate: '2026-09-08T17:00:00.000Z' })])
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('Next session')
        expect(element.textContent).toContain('Nothing planned yet')
        expect(element.querySelector('a[href="/sessions/21"]')).toBeNull()
    })

    it('counts people without an account and their games, like the group page', () => {
        fixture.componentRef.setInput('group', {
            ...group,
            placeholders: [{ id: 5, displayName: 'Nora', avatar: null, gameIds: [12, 13] }],
        })
        fixture.detectChanges()

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('3 people · 3 shared games')
    })
})
