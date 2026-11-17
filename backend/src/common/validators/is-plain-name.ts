import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * ## Plain names - What a person's or a group's name may contain (#350)
 * The length limit counts characters, not width: twenty "⸻" are as wide as sixty letters, and
 * invisible or stacked characters break layouts in other ways. A name is letters of any script,
 * numbers, emoji, spaces and ordinary punctuation. Kept in step with the frontend's copy (frontend/src/app/core/utils/plainName.ts).
 */

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const char = (...codePoints: Array<number>) => codePoints.map(codePoint => String.fromCodePoint(codePoint))

/** Emoji (people, flags, keycaps): their joiners, selectors and tags belong to them. */
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{20E3}/u
/** Something a name can be read by. */
const READABLE = /[\p{L}\p{N}]|\p{Extended_Pictographic}|\p{Regional_Indicator}/u
/** Control, private-use, surrogate and line/paragraph separator characters. */
const NEVER = /[\p{Cc}\p{Co}\p{Cs}\p{Zl}\p{Zp}]/u
/** Invisible formatting (bidi overrides, zero-width space); the joiners scripts need (ZWNJ, ZWJ) stay. */
const FORMAT = /\p{Cf}/u
const ALLOWED_FORMAT = new Set(char(0x200c, 0x200d))
/** Dashes: the hyphen, en and em dash are words' punctuation; longer ones are lines. */
const DASH = /\p{Pd}/u
const ALLOWED_DASHES = new Set(char(0x2d, 0x2010, 0x2011, 0x2013, 0x2014))
/** Box drawing, block elements, the two- and three-em dashes, and single glyphs as wide as a sentence (﷽, ꧅). */
const DRAWING = /[\u{2500}-\u{259F}\u{2E3A}\u{2E3B}\u{FDFD}\u{A9C5}]/u
/** More combining marks on one letter than any script needs: "Zalgo" text. */
const MAX_MARKS_PER_LETTER = 4
const MARK = /\p{M}/gu

/** True when this user-perceived character can't be part of a name. */
function isLayoutCharacter(segment: string): boolean {
    if (NEVER.test(segment)) return true
    if (EMOJI.test(segment)) return false
    if ((segment.match(MARK)?.length ?? 0) > MAX_MARKS_PER_LETTER) return true
    for (const character of segment) {
        if (FORMAT.test(character) && !ALLOWED_FORMAT.has(character)) return true
        if (DASH.test(character) && !ALLOWED_DASHES.has(character)) return true
        if (DRAWING.test(character)) return true
    }
    return false
}

/**
 * @param name a display name or group name, as typed
 * @returns true when it only has characters that read as a name
 */
export function isPlainName(name: string): boolean {
    if (!READABLE.test(name)) return false
    return !Array.from(graphemes.segment(name)).some(({ segment }) => isLayoutCharacter(segment))
}

/**
 * A name saved before the rule, made readable: its layout characters left out and spaces
 * collapsed. A name with nothing readable left keeps its first three characters and "…", so it
 * still takes little room.
 */
export function readableName(name: string): string {
    if (isPlainName(name)) return name
    const characters = Array.from(graphemes.segment(name), ({ segment }) => segment)
    const kept = characters
        .filter(segment => !isLayoutCharacter(segment))
        .join('')
        .replace(/\s+/gu, ' ')
        .trim()

    return READABLE.test(kept) ? kept : `${characters.slice(0, 3).join('')}…`
}

/** Validates a property with `isPlainName`; anything but a string is left to `IsString`. */
export function IsPlainName(validationOptions?: ValidationOptions): PropertyDecorator {
    return (target, propertyName) => {
        registerDecorator({
            name: 'isPlainName',
            target: target.constructor,
            propertyName: String(propertyName),
            options: { message: '$property may only have letters, numbers, emoji, spaces and ordinary punctuation', ...validationOptions },
            validator: { validate: (value: unknown) => typeof value !== 'string' || isPlainName(value) },
        })
    }
}
