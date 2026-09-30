// Cheap documentation drift guards, run in CI:
// 1. every relative Markdown link (and #anchor into a Markdown file) resolves;
// 2. the Node version agrees across .nvmrc, package.json engines, and docs.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const problems = []

// GitHub's heading anchor: lowercase, drop punctuation, spaces to hyphens.
const slug = heading =>
    heading
        .trim()
        .toLowerCase()
        .replace(/[`*_]/g, '')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s/g, '-')

const anchorsCache = new Map()
function anchorsOf(file) {
    if (!anchorsCache.has(file)) {
        const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '')
        anchorsCache.set(file, new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => slug(match[1]))))
    }
    return anchorsCache.get(file)
}

const markdownFiles = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '*.md'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(file => existsSync(join(root, file)))

for (const file of markdownFiles) {
    const absolute = join(root, file)
    const text = readFileSync(absolute, 'utf8').replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')

    for (const [, target] of text.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        if (/^(https?:|mailto:)/.test(target)) continue

        const [pathPart, anchor] = target.split('#')
        const destination = pathPart ? resolve(dirname(absolute), decodeURI(pathPart)) : absolute

        if (!existsSync(destination)) {
            problems.push(`${file}: broken link ${target}`)
            continue
        }
        if (anchor && destination.endsWith('.md') && statSync(destination).isFile() && !anchorsOf(destination).has(anchor)) {
            problems.push(`${file}: missing anchor #${anchor} in ${relative(root, destination)}`)
        }
    }
}

const nvmrc = readFileSync(join(root, '.nvmrc'), 'utf8').trim()
const major = nvmrc.split('.')[0]

for (const manifest of ['package.json', 'backend/package.json', 'frontend/package.json']) {
    const engines = JSON.parse(readFileSync(join(root, manifest), 'utf8')).engines?.node
    if (engines !== `${major}.x`) problems.push(`${manifest}: engines.node is ${engines ?? 'missing'}, expected ${major}.x (.nvmrc ${nvmrc})`)
}

const onboarding = readFileSync(join(root, 'docs/onboarding.md'), 'utf8')
for (const [version] of onboarding.matchAll(/\b\d{2}\.\d+\.\d+\b/g)) {
    if (version !== nvmrc) problems.push(`docs/onboarding.md: mentions Node ${version}, .nvmrc is ${nvmrc}`)
}
if (!onboarding.includes(`Node.js ${major}`)) problems.push(`docs/onboarding.md: should say Node.js ${major}`)

if (problems.length > 0) {
    console.error(`Docs check failed:\n- ${problems.join('\n- ')}`)
    process.exit(1)
}

console.log(`Docs check passed (${markdownFiles.length} Markdown files; Node ${nvmrc}).`)
