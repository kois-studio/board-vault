import { Component, input } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import type { NameTranslationsType } from '../../../api/api.types'

const LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
] as const

type TranslationControls = Record<(typeof LANGUAGES)[number]['code'], FormControl<string>>

/** The form for a tag's or category's name in each other interface language (ADR-0024); English is the name field. */
export function nameTranslationsForm(): FormGroup<TranslationControls> {
    const control = () => new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] })
    return new FormGroup({ es: control(), fr: control(), de: control(), it: control() })
}

/** Every language, trimmed: an empty one removes that language's name, so clearing a field deletes it. */
export function nameTranslationsPayload(form: FormGroup<TranslationControls>): Required<NameTranslationsType> {
    const value = form.getRawValue()
    return { es: value.es.trim(), fr: value.fr.trim(), de: value.de.trim(), it: value.it.trim() }
}

/** Fills the form from saved names; a language without one is left empty. */
export function nameTranslationsValue(translations: NameTranslationsType): Required<NameTranslationsType> {
    return { es: translations.es ?? '', fr: translations.fr ?? '', de: translations.de ?? '', it: translations.it ?? '' }
}

/** Administration (English): the name in Spanish, French, German, and Italian. Empty shows the English name. */
@Component({
    imports: [ReactiveFormsModule],
    selector: 'app-name-translation-fields',
    template: `
        <fieldset [formGroup]="group()" class="space-y-2">
            <legend class="mb-2 block text-sm font-medium text-bv-text-muted">Name in other languages</legend>
            <p class="text-xs text-bv-text-muted">Leave a language empty to show the English name in it.</p>
            @for (language of languages; track language.code) {
                <div class="flex items-center gap-3">
                    <label [for]="idPrefix() + '-' + language.code" class="w-20 shrink-0 text-sm text-bv-text-muted">{{ language.name }}</label>
                    <input
                        [id]="idPrefix() + '-' + language.code"
                        type="text"
                        [attr.lang]="language.code"
                        [formControlName]="language.code"
                        maxlength="100"
                        class="w-full rounded-md border border-bv-border bg-bv-surface px-3 py-2 text-bv-text shadow-sm focus:border-bv-primary focus:outline-none focus:ring-2 focus:ring-bv-primary"
                    />
                </div>
            }
        </fieldset>
    `,
})
export class NameTranslationFieldsComponent {
    readonly group = input.required<FormGroup<TranslationControls>>()
    /** Keeps the inputs' ids unique when two dialogs are in the page. */
    readonly idPrefix = input.required<string>()
    protected readonly languages = LANGUAGES
}
