import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'customDate',
})
export class CustomDatePipe implements PipeTransform {
    transform(value: null | string | Date, includeTime = false, timezone?: string): string {
        if (!value) {
            return ''
        }

        // If the value is a string, try to parse it as a date
        let date: Date
        if (typeof value === 'string') {
            // Check if it's already a formatted date from toLocaleDateString()
            if (value.includes('/')) {
                // For dateGroup.key which is already formatted with toLocaleDateString()
                // Just return it as is
                return value
            }
            // Otherwise, try to parse it as a proper ISO date
            date = new Date(value.replace(' ', 'T'))
        } else {
            date = value
        }

        // Format the date using Intl.DateTimeFormat
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
            ...(timezone ? { timeZone: timezone } : {}),
        }).format(date)
    }
}
