import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const allowedExpressions = [
    'port',
    'propertyKey',
    "valid ? 'valid' : 'expired'",
    'safeErrorName(error)',
    "err instanceof Error ? err.name : 'unknown error'",
    "error instanceof Error ? error.name : 'unknown error'",
]

async function collectTypeScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...(await collectTypeScriptFiles(path)))
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            files.push(path)
        }
    }

    return files
}

const loggerTemplatePattern = /(?:LOGGER|logger)\.(?:log|warn|error|debug|verbose)\(\s*`([\s\S]*?)`\s*\)/g
const violations = []

for (const file of await collectTypeScriptFiles(sourceRoot)) {
    const source = await readFile(file, 'utf8')

    for (const match of source.matchAll(loggerTemplatePattern)) {
        const message = match[1]
        for (const expression of message.matchAll(/\$\{([^}]+)\}/g)) {
            const value = expression[1].trim()
            if (!allowedExpressions.includes(value)) {
                violations.push(`${file.pathname}:${source.slice(0, match.index).split('\n').length}: ${value}`)
            }
        }
    }
}

if (violations.length > 0) {
    console.error('Unsafe dynamic logger fields found:')
    for (const violation of violations) console.error(`- ${violation}`)
    process.exit(1)
}

console.log('Log boundary audit passed: dynamic logger fields are allow-listed.')
