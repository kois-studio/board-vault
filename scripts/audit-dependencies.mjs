#!/usr/bin/env node
/**
 * `npm audit` at every level, except advisories listed in audit-allowlist.json
 * (no fixed version, not in production). Run from backend/ or frontend/:
 *   node ../scripts/audit-dependencies.mjs
 * Fails on any other advisory, and on an allowed one past its reviewBy date.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const allowlist = JSON.parse(readFileSync(join(root, 'audit-allowlist.json'), 'utf8')).advisories
const today = new Date().toISOString().slice(0, 10)

let output
try {
    output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
} catch (error) {
    // npm audit exits 1 when it finds anything; the report is still on stdout.
    output = error.stdout
}
const report = JSON.parse(output)
if (report.error) {
    console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
    process.exit(1)
}

/** Advisory id (GHSA-…) → the packages it was found in. */
const found = new Map()
for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
        if (typeof via === 'string') continue // vulnerable only through another package, reported there
        const id = via.url?.split('/').pop() ?? String(via.source)
        found.set(id, [...(found.get(id) ?? []), `${name} (${via.severity}): ${via.title}`])
    }
}

let failed = false
for (const [id, entries] of found) {
    const allowed = allowlist.find((entry) => entry.id === id)
    if (!allowed) {
        failed = true
        console.error(`Not allowed: ${id}\n  ${entries.join('\n  ')}`)
    } else if (allowed.reviewBy < today) {
        failed = true
        console.error(`Allowed until ${allowed.reviewBy}, review it again: ${id}\n  ${entries.join('\n  ')}`)
    } else {
        console.log(`Allowed until ${allowed.reviewBy}: ${id} (${allowed.package}). ${allowed.reason}`)
    }
}
for (const entry of allowlist) {
    if (!found.has(entry.id)) console.log(`No longer reported here: ${entry.id}. Remove it from audit-allowlist.json once no project reports it.`)
}

if (failed) process.exit(1)
console.log(found.size === 0 ? 'found 0 vulnerabilities' : 'Only allowed advisories found.')
