import { isClerkJwtKey, readClerkJwtKey } from './clerk-jwt-key.js'

const body =
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo\n4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u\n+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh\nkd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ\n0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg\ncKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc\nmwIDAQAB'
const pem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`

describe('CLERK_JWT_KEY (#250)', () => {
    it('is unset when empty', () => {
        expect(readClerkJwtKey(undefined)).toBeUndefined()
        expect(readClerkJwtKey('  ')).toBeUndefined()
    })

    it('reads a key pasted on several lines as it is', () => {
        expect(readClerkJwtKey(`${pem}\n`)).toBe(pem)
        expect(isClerkJwtKey(readClerkJwtKey(pem)!)).toBe(true)
    })

    it('turns a written-out \\n into a line break, as on one-line hosting settings', () => {
        const oneLine = pem.replace(/\n/g, '\\n')

        expect(readClerkJwtKey(oneLine)).toBe(pem)
    })

    it('turns Windows line breaks into plain ones, which Clerk removes before reading the key', () => {
        expect(readClerkJwtKey(pem.replace(/\n/g, '\r\n'))).toBe(pem)
    })

    it('tells a PEM public key from other values', () => {
        expect(isClerkJwtKey(pem)).toBe(true)
        expect(isClerkJwtKey(body)).toBe(false)
        expect(isClerkJwtKey('sk_test_example')).toBe(false)
        expect(isClerkJwtKey(pem.replace('PUBLIC KEY', 'PRIVATE KEY'))).toBe(false)
        expect(isClerkJwtKey(`${pem}\nextra`)).toBe(false)
    })
})
