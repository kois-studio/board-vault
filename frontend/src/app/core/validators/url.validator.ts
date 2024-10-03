import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
        const isValid = urlPattern.test(control.value);
        return isValid ? null : { invalidUrl: true };
    };
}
