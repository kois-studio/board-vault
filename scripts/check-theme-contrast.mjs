// Every theme in frontend/src/styles.css, light and dark, must keep the text
// pairs of docs/design-system.md readable (WCAG AA: 4.5:1 for text, 3:1 for
// icons), and the browser bar colours must match each theme's background.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = path => readFileSync(resolve(root, path), 'utf8')
const css = read('frontend/src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '')
const problems = []

// Top-level rules only: the high-contrast media query only raises contrast.
const blocks = []
let depth = 0
let start = 0
for (let index = 0; index < css.length; index++) {
    if (css[index] === '{') {
        if (depth === 0) blocks.push({ selector: css.slice(start, index).split(';').at(-1).trim(), from: index + 1 })
        depth++
    } else if (css[index] === '}') {
        depth--
        if (depth === 0) {
            blocks.at(-1).body = css.slice(blocks.at(-1).from, index)
            start = index + 1
        }
    }
}

const tokensOf = body =>
    Object.fromEntries([...body.matchAll(/--bv-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [name, value.toLowerCase()]))

// Ciruela lives on `:root` (light) and `.dark`; other themes on `[data-theme="…"]` and `[data-theme="…"].dark`.
const themes = { ciruela: { light: {}, dark: {} } }
for (const { selector, body } of blocks) {
    if (!body?.includes('--bv-')) continue
    const selectors = selector.split(',').map(part => part.trim())
    if (selectors.includes(':root')) Object.assign(themes.ciruela.light, tokensOf(body))
    else if (selectors.includes('.dark')) Object.assign(themes.ciruela.dark, tokensOf(body))
    else {
        const match = selector.match(/^\[data-theme="([a-z-]+)"\](\.dark)?$/)
        if (!match) continue
        themes[match[1]] ??= { light: {}, dark: {} }
        Object.assign(themes[match[1]][match[2] ? 'dark' : 'light'], tokensOf(body))
    }
}

const channels = hex => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16))
const luminance = hex =>
    channels(hex)
        .map(value => value / 255)
        .map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
}
// `text-bv-on-primary/80`: the colour at 80% over the fill.
const mix = (top, bottom, alpha) =>
    `#${channels(top)
        .map((value, index) => Math.round(value * alpha + channels(bottom)[index] * (1 - alpha)))
        .map(value => value.toString(16).padStart(2, '0'))
        .join('')}`

const surfaces = ['bg', 'surface', 'surface-2']
const pairs = mode => [
    ...['text', 'text-muted', 'primary'].flatMap(text => surfaces.map(surface => [text, surface, 4.5])),
    // Status text sits on the page and on cards (Ciruela's success on surface-2 is 4.2:1).
    ...['success', 'warning', 'danger'].flatMap(text => ['bg', 'surface'].map(surface => [text, surface, 4.5])),
    ['on-primary', 'primary', 4.5],
    ['on-primary/80', 'primary', 4.5],
    ['on-primary-soft', 'primary-soft', 4.5],
    ['on-accent', 'accent', 4.5],
    ['on-success', 'success', 4.5],
    ['on-warning', 'warning', 4.5],
    ['on-danger', 'danger', 4.5],
    // Rating stars: warning in light mode, Sunglow in dark mode.
    ...surfaces.map(surface => [mode === 'light' ? 'warning' : 'accent', surface, 3]),
]

const report = []
for (const [name, theme] of Object.entries(themes)) {
    for (const mode of ['light', 'dark']) {
        const tokens = { ...themes.ciruela[mode], ...theme[mode] }
        tokens['on-primary/80'] = tokens['on-primary'] && tokens.primary && mix(tokens['on-primary'], tokens.primary, 0.8)
        let lowest = Number.POSITIVE_INFINITY
        for (const [foreground, background, minimum] of pairs(mode)) {
            if (!tokens[foreground] || !tokens[background]) {
                problems.push(`${name} ${mode}: --bv-${foreground} or --bv-${background} is missing`)
                continue
            }
            const ratio = contrast(tokens[foreground], tokens[background])
            lowest = Math.min(lowest, ratio)
            if (ratio < minimum) problems.push(`${name} ${mode}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`)
        }
        report.push(`${name} ${mode}: lowest ${lowest.toFixed(2)}:1`)
    }
}

// The browser bar colour (index.html before the first paint, ThemeService after) is each theme's background.
for (const file of ['frontend/src/index.html', 'frontend/src/app/core/services/theme.service.ts']) {
    const source = read(file).toLowerCase()
    for (const [name, theme] of Object.entries(themes)) {
        const pair = new RegExp(`${name}:\\s*\\{\\s*light:\\s*'(#[0-9a-f]{6})',\\s*dark:\\s*'(#[0-9a-f]{6})'`).exec(source)
        const expected = [themes.ciruela.light, themes.ciruela.dark].map((ciruela, index) => (index ? theme.dark : theme.light).bg ?? ciruela.bg)
        if (!pair) problems.push(`${file}: no browser bar colours for ${name}`)
        else if (pair[1] !== expected[0] || pair[2] !== expected[1])
            problems.push(`${file}: ${name} browser bar colours should be ${expected.join(' / ')}`)
    }
}

if (Object.keys(themes).length < 2) problems.push('no themes found in styles.css')

if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
}
console.log(report.join('\n'))
