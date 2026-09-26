import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'
import { GroupViewComponent, shouldShowFirstGroupSetup } from './group-view.component'

describe('formatAttendeeSummary', () => {
    it('uses an honest fallback when no attendance was recorded', () => {
        expect(formatAttendeeSummary([])).toBe('Attendance not recorded')
    })

    it('keeps a short attendee list readable and summarizes longer lists', () => {
        const attendees = [
            { displayName: 'Ana', username: 'ana' },
            { displayName: '', username: 'bo' },
            { displayName: 'Cris', username: 'cris' },
            { displayName: 'Dani', username: 'dani' },
        ]

        expect(formatAttendeeSummary(attendees.slice(0, 2))).toBe('With Ana, bo')
        expect(formatAttendeeSummary(attendees)).toBe('With Ana, bo, Cris + 1 more')
    })
})

describe('shouldShowFirstGroupSetup', () => {
    const emptyGroup = {
        memberCount: 1,
        gameCount: 0,
        historyCount: 0,
        hasUpcomingSession: false,
        historyLoading: false,
        historyError: false,
    }

    it('shows the invite, add-games, and first-session handoff for a new empty group', () => {
        expect(shouldShowFirstGroupSetup(emptyGroup)).toBeTrue()
    })

    it('does not show onboarding while history is unresolved or after the group has activity', () => {
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, historyLoading: true })).toBeFalse()
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, memberCount: 2 })).toBeFalse()
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, gameCount: 1 })).toBeFalse()
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, hasUpcomingSession: true })).toBeFalse()
    })
})

describe('group participant history presentation', () => {
    it('includes placeholder attendees and players in the same summaries as account members', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        expect(component.getAttendeeSummary([{ displayName: 'Carlos', username: 'carlos' } as never], [{ displayName: 'Ana' }])).toBe(
            'With Carlos, Ana',
        )
    })
})
