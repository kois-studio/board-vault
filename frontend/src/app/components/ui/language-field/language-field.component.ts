import { Component, computed, input, model, signal } from '@angular/core'
import { INTERFACE_LANGUAGE_CODES, languageName } from '../../../core/i18n/language-names'

const OTHER = '__other'

/**
 * A language: a select of the interface languages (named in the page's language) and an "Other" option
 * that shows a field for any BCP 47 code ("pt-BR"). `value` is the code, empty while an "Other" has none yet.
 */
@Component({
    selector: 'app-language-field',
    templateUrl: './language-field.component.html',
})
export class LanguageFieldComponent {
    readonly value = model.required<string>()
    /** Names the select and the code field for assistive technology. */
    readonly label = input.required<string>()
    readonly otherLabel = input('Other…')
    readonly codeLabel = input('Language code')
    readonly codePlaceholder = input('pt-BR')
    readonly disabled = input(false)

    public readonly interfaceLanguages = INTERFACE_LANGUAGE_CODES
    public readonly otherChosen = signal(false)
    public readonly isOther = computed(() => this.otherChosen() || !INTERFACE_LANGUAGE_CODES.includes(this.value()))

    public name(code: string): string {
        return languageName(code)
    }

    public select(choice: string): void {
        this.otherChosen.set(choice === OTHER)
        this.value.set(choice === OTHER ? '' : choice)
    }

    public type(code: string): void {
        this.value.set(code.trim())
    }
}
