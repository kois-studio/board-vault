import { execFileSync } from 'node:child_process'

const forbiddenPatterns = [
    /(^|\/)\.env$/i,
    /(^|\/)\.env\.(?!example$)[^/]+$/i,
    /(^|\/)frontend\/public\/runtime-config\.js$/i,
    /(^|\/)(?:dist|coverage|playwright-report|test-results)\//i,
    /(^|\/)[^/]*(?:storage-state|browser-state|session-state)[^/]*\.(?:json|zip)$/i,
    /(^|\/)[^/]*\.(?:sqlite|sqlite3|db|dump|bak|sql\.gz)$/i,
    /(^|\/)do-not-commit_RedesignUIUX\.md$/i,
]

function gitFiles(args) {
    return execFileSync('git', args, { encoding: 'utf8' })
        .split('\n')
        .map((file) => file.trim())
        .filter(Boolean)
}

const trackedFiles = gitFiles(['ls-files'])
const stagedFiles = gitFiles(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
const forbiddenTrackedFiles = trackedFiles.filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file)))
const forbiddenStagedFiles = stagedFiles.filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file)))

if (forbiddenTrackedFiles.length > 0 || forbiddenStagedFiles.length > 0) {
    console.error('Public tree check failed. Remove these files before publishing:')
    for (const file of [...new Set([...forbiddenTrackedFiles, ...forbiddenStagedFiles])]) {
        console.error(`- ${file}`)
    }
    process.exit(1)
}

console.log(`Public tree check passed (${trackedFiles.length} tracked files; no forbidden staged files).`)
