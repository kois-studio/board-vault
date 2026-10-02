import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import type { GroupWithMembersAndGames, MeetType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardGroupComponent } from './card-group.component'

describe('CardGroupComponent social entry surface', () => {
    let fixture: ComponentFixture<CardGroupComponent>

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
        await TestBed.configureTestingModule({
            imports: [CardGroupComponent],
            providers: [
                { provide: ActivatedRoute, useValue: {} },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal(null),
                        userMeets: signal([
                            {
                                id: 21,
                                groupId: 7,
                                createdBy: 1,
                                meetDate: '2026-09-12T18:00:00.000Z',
                                isConfirmed: true,
                                status: 'scheduled',
                                timezone: 'Europe/Madrid',
                                notes: null,
                            } as MeetType,
                        ]),
                    },
                },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(CardGroupComponent)
        fixture.componentRef.setInput('group', group)
        fixture.componentRef.setInput('invitations', [])
        fixture.detectChanges()
    })

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
})
