import { createServer, type Server } from 'node:http'

import { ProviderTimeoutError, fetchWithTimeout, withTimeout } from './provider-timeout.js'

import type { AddressInfo } from 'node:net'

describe('provider timeouts', () => {
    describe('fetchWithTimeout', () => {
        let server: Server
        let url: string

        beforeAll(async () => {
            // Answers /ok at once and never answers anything else.
            server = createServer((request, response) => {
                if (request.url === '/ok') response.end('ok')
            })
            await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
            url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
        })

        afterAll(async () => {
            server.closeAllConnections()
            await new Promise(resolve => server.close(resolve))
        })

        it('aborts a hung call with a provider timeout', async () => {
            await expect(fetchWithTimeout('database', 50)(`${url}/hang`)).rejects.toEqual(new ProviderTimeoutError('database'))
        })

        it('returns responses that arrive in time', async () => {
            const response = await fetchWithTimeout('database', 1_000)(`${url}/ok`)

            await expect(response.text()).resolves.toBe('ok')
        })

        it('keeps the caller abort as its own error', async () => {
            const call = fetchWithTimeout('database', 1_000)(`${url}/hang`, { signal: AbortSignal.abort() })

            await expect(call).rejects.not.toBeInstanceOf(ProviderTimeoutError)
        })
    })

    describe('withTimeout', () => {
        it('rejects when the operation outlives the limit', async () => {
            await expect(withTimeout(new Promise(() => {}), 'clerk', 10)).rejects.toEqual(new ProviderTimeoutError('clerk'))
        })

        it('passes results and errors through', async () => {
            await expect(withTimeout(Promise.resolve('done'), 'clerk', 10)).resolves.toBe('done')
            await expect(withTimeout(Promise.reject(new Error('boom')), 'clerk', 10)).rejects.toThrow('boom')
        })
    })
})
