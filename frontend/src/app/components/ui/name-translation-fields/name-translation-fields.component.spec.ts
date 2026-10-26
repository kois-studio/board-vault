import { nameTranslationsForm, nameTranslationsPayload, nameTranslationsValue } from './name-translation-fields.component'

describe('name translation fields', () => {
    it('sends every language, trimmed, so a cleared field removes that name', () => {
        const form = nameTranslationsForm()
        form.setValue(nameTranslationsValue({ es: 'Cooperativo', de: 'Kooperativ' }))
        form.patchValue({ es: '  Cooperativo ', de: '' })

        expect(nameTranslationsPayload(form)).toEqual({ es: 'Cooperativo', fr: '', de: '', it: '' })
    })

    it('refuses a name longer than the API accepts', () => {
        const form = nameTranslationsForm()
        form.patchValue({ fr: 'x'.repeat(101) })

        expect(form.invalid).toBe(true)
    })
})
