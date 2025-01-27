import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    standalone: true,
    name: 'customDate',
})
export class CustomDatePipe implements PipeTransform {
    transform(value: string | Date): string {
        // If the value is a string, parse it into a Date object
        const date = typeof value === 'string' ? new Date(value.replace(' ', 'T')) : value

        // Format the date using Intl.DateTimeFormat
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date)
    }
}
