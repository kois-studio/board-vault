import type { RsvpStatus } from '../../api/api.types'

/** What a person sees after answering a game night. */
export function rsvpToast(status: RsvpStatus): string {
    if (status === 'accepted') return 'You’re going.'
    if (status === 'declined') return 'Got it, you can’t make it.'
    return 'Your answer was saved.'
}

/** Short label for your own answer on a game-night card. */
export function myRsvpLabel(status: RsvpStatus): string {
    if (status === 'accepted') return 'You’re going'
    if (status === 'declined') return 'You can’t make it'
    return 'Waiting for your answer'
}
