import { browserFamily, endpointTemplate, problemFingerprint, scrubProblemText } from './problem-scrub.js'

describe('scrubProblemText (ADR-0028)', () => {
    it('takes out emails, tokens, address queries, UUIDs and long numbers', () => {
        const text = [
            'ana.lopez+bv@example.com',
            'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJl',
            'Bearer abc.def-ghi',
            'https://board-vault.com/claim?token=abc#frag',
            '6f1c2b8e-3d4a-4b5c-9e7f-0a1b2c3d4e5f',
            'phone 600123456',
        ].join(' | ')

        expect(scrubProblemText(text, 500)).toBe('[email] | [token] | Bearer [token] | https://board-vault.com/claim | [id] | phone #')
    })

    it('keeps short numbers and stack positions', () => {
        expect(scrubProblemText('Expected 12 items at main-AB.js:1:23456', 500)).toBe('Expected 12 items at main-AB.js:1:23456')
    })

    it('cuts long text', () => {
        expect(scrubProblemText('x'.repeat(20), 10)).toBe(`${'x'.repeat(9)}…`)
    })
})

describe('endpointTemplate', () => {
    it('replaces ids with :id and drops the query', () => {
        expect(endpointTemplate('get', '/dashboard/users/12/groups/3/shelf?x=1')).toBe('GET /dashboard/users/:id/groups/:id/shelf')
        expect(endpointTemplate('POST', '/users/:userId/groups')).toBe('POST /users/:userId/groups')
    })

    it('drops what is not a plain path or a known method', () => {
        expect(endpointTemplate('TRACE', '/x')).toBeNull()
        expect(endpointTemplate('GET', '/users/ana lopez')).toBeNull()
        expect(endpointTemplate('GET', 'https://evil.example/x')).toBeNull()
    })
})

describe('browserFamily', () => {
    it.each([
        [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
            'Safari 18 · iOS',
        ],
        [
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
            'Chrome 131 · Android',
        ],
        [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
            'Edge 131 · Windows',
        ],
        ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0', 'Firefox 133 · macOS'],
        ['curl/8.0', 'Other'],
    ])('%s', (userAgent, expected) => {
        expect(browserFamily(userAgent)).toBe(expected)
    })

    it('is null without a user agent', () => {
        expect(browserFamily(undefined)).toBeNull()
    })
})

describe('problemFingerprint', () => {
    const base = { source: 'app', kind: 'error', name: 'Error', message: 'Expected 12 items', view: '/play', endpoint: null, status: null }

    it('is the same whatever the numbers, and differs by screen', () => {
        expect(problemFingerprint(base)).toBe(problemFingerprint({ ...base, message: 'Expected 13 items' }))
        expect(problemFingerprint(base)).not.toBe(problemFingerprint({ ...base, view: '/collection' }))
    })
})
