import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardGroupComponent } from './card-group.component'

describe('CardGroupComponent (Home)', () => {
    let fixture: ComponentFixture<CardGroupComponent>
    const currentUser = signal<{ id: number } | null>({ id: 1 })

    const member = (id: number, gameIds: Array<number>) => ({
        id,
        username: `user${id}`,
        displayName: `User ${id}`,
        avatar: { backgroundColor: '#fff', iconName: null, emoji: null, type: 'initials' as const, initials: `U${id}` },
        joinedAt: '2026-09-01T10:00:00.000Z',
        games: gameIds.map((gameId) => ({ id: gameId })),
        reviews: [],
    })

    const group = {
        id: 7,
        name: 'Friday crew',
        createdBy: 1,
        createdAt: '2026-09-01T10:00:00.000Z',
        members: [member(1, [11]), member(2, [11, 12])],
        placeholders: [],
    } as unknown as GroupWithMembersAndGames

    const element = () => fixture.nativeElement as HTMLElement

    beforeEach(async () => {
        currentUser.set({ id: 1 })
        await TestBed.configureTestingModule({
            imports: [CardGroupComponent],
            providers: [provideRouter([]), { provide: DataService, useValue: { currentUser } }],
        }).compileComponents()

        fixture = TestBed.createComponent(CardGroupComponent)
        fixture.componentRef.setInput('group', group)
        fixture.componentRef.setInput('invitations', [])
        fixture.detectChanges()
    })

    it('opens the group from its name and offers the three shortcuts', () => {
        expect(element().querySelector('h3 a')?.getAttribute('href')).toBe('/groups/7')

        const shortcuts = Array.from(element().querySelectorAll('nav a')).map((link) => [
            link.textContent?.trim(),
            link.getAttribute('href'),
        ])
        expect(shortcuts).toEqual([
            ['What to play', '/play/recommendations?groupId=7'],
            ['Library', '/groups/7#library'],
            ['History', '/play/history?groupId=7'],
        ])
    })

    it('does not repeat the next night, which Home already leads with', () => {
        expect(element().textContent).not.toContain('Next session')
        expect(element().querySelector('a[href^="/sessions/"]')).toBeNull()
    })

    it('counts people without an account and their games, like the group page', () => {
        fixture.componentRef.setInput('group', {
            ...group,
            placeholders: [{ id: 5, displayName: 'Nora', avatar: null, gameIds: [12, 13], games: [] }],
        })
        fixture.detectChanges()

        expect(element().textContent).toContain('3 people · 3 games')
    })

    it('lets a long name take two lines, breaking even without spaces, with the whole name on hover', () => {
        const title = element().querySelector('h3') as HTMLElement

        expect(title.classList).toContain('line-clamp-2')
        expect(title.classList).toContain('wrap-anywhere')
        expect(title.classList).not.toContain('truncate')
        expect(title.querySelector('a')?.getAttribute('title')).toBe('Friday crew')
    })

    it('names the group in its people list, so stacked cards are told apart', () => {
        expect(element().querySelector('ul')?.getAttribute('aria-label')).toBe('People in Friday crew')
    })

    it('shows the first five faces and how many more there are', () => {
        fixture.componentRef.setInput('group', { ...group, members: [1, 2, 3, 4, 5, 6, 7].map((id) => member(id, [])) })
        fixture.detectChanges()

        expect(element().querySelectorAll('app-image-profile')).toHaveLength(5)
        expect(element().textContent).toContain('+2')
    })

    it('nudges the owner of a small group to invite, with the invitations still pending', () => {
        fixture.componentRef.setInput('invitations', [{ id: 1 }] as unknown as Array<InvitationWithAccountsData>)
        fixture.detectChanges()

        const nudge = element().querySelector('a[href="/groups/7/edit"]')
        expect(nudge?.textContent).toContain('Invite your people')
        expect(nudge?.textContent).toContain('1 invitation pending')
    })

    it('says where the group stands only when given, in the tone of its night', () => {
        expect(element().querySelector('header .rounded-full.text-xs')).toBeNull()

        fixture.componentRef.setInput('activity', { tone: 'live', label: 'Happening now', time: 0 })
        fixture.detectChanges()
        const chip = element().querySelector('header .rounded-full.text-xs')
        expect(chip?.textContent?.trim()).toBe('Happening now')
        expect(chip?.classList).toContain('bg-bv-success')

        fixture.componentRef.setInput('activity', { tone: 'next', label: 'Tomorrow', time: 0 })
        fixture.detectChanges()
        expect(element().querySelector('header .rounded-full.text-xs')?.classList).toContain('bg-bv-primary-soft')
        // The chip sits outside the name, which stays the link's only text.
        expect(element().querySelector('h3 a')?.textContent?.trim()).toBe('Friday crew')
    })

    it('stops nudging once the group has four people, and never nudges a member who cannot invite', () => {
        fixture.componentRef.setInput('group', { ...group, members: [1, 2, 3, 4].map((id) => member(id, [])) })
        fixture.detectChanges()
        expect(element().querySelector('a[href="/groups/7/edit"]')).toBeNull()

        fixture.componentRef.setInput('group', group)
        currentUser.set({ id: 2 })
        fixture.detectChanges()
        expect(element().querySelector('a[href="/groups/7/edit"]')).toBeNull()
    })
})
