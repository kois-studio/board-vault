import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'sortByDate',
})
export class SortByDatePipe implements PipeTransform {
    transform<T extends object>(value: Array<T>, order = 'asc', property = 'createdAt'): Array<T> {
        if (!Array.isArray(value) || !value.length) {
            return value
        }

        const sortedArray = value.sort((a, b) => {
            const dateA = new Date(String((a as Record<string, unknown>)[property])).getTime()
            const dateB = new Date(String((b as Record<string, unknown>)[property])).getTime()

            if (order === 'desc') {
                return dateA - dateB
            }
            return dateB - dateA
        })

        return sortedArray
    }
}
