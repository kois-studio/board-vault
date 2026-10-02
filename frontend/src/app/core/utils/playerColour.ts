/**
 * Player colours from the "Ciruela" palette (docs/design-system.md). Avatars
 * store a light-mode hex; the eight player hexes, and the colours of the
 * earlier palette, render through `--bv-player-N` so they follow the theme.
 */
export const PLAYER_COLOURS = ['#C0392B', '#B45309', '#4D7C0F', '#047857', '#0E7490', '#1D4ED8', '#7E22CE', '#BE185D'] as const

const PLAYER_SLOT: Record<string, number> = {
    ...Object.fromEntries(PLAYER_COLOURS.map((hex, index) => [hex, index + 1])),
    // Earlier avatar palette and account default.
    '#EF4444': 1,
    '#F97316': 2,
    '#F59E0B': 2,
    '#10B981': 4,
    '#06B6D4': 5,
    '#3B82F6': 6,
    '#6366F1': 7,
    '#8B5CF6': 7,
    '#EC4899': 8,
}
const NEUTRAL = new Set(['#6B7280', '#1F2937', '#0F172A', '#64748B'])

export type PlayerColourStyle = { background: string; color: string }

/** Background and text colour for an avatar stored with `backgroundColor`. */
export function playerColourStyle(backgroundColor: string | null | undefined): PlayerColourStyle {
    const hex = (backgroundColor ?? '').toUpperCase()
    const slot = PLAYER_SLOT[hex]
    if (slot) return { background: `var(--bv-player-${slot})`, color: 'var(--bv-on-player)' }
    if (NEUTRAL.has(hex) || !hex) return { background: 'var(--bv-text-muted)', color: 'var(--bv-surface)' }
    return { background: backgroundColor as string, color: '#FFFFFF' }
}
