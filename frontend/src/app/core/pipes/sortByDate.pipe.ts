import { Pipe, PipeTransform } from '@angular/core'

/**
 * Sorts by a date field: `asc` (the default) puts the newest first, `desc` the oldest. Items with the
 * same date keep a stable order, newest id first. Returns a sorted copy: the input, often a signal's
 * value, is left as it is.
 */
@Pipe({
    name: 'sortByDate',
})
export class SortByDatePipe implements PipeTransform {
    transform<T extends object>(value: Array<T>, order = 'asc', property = 'createdAt'): Array<T> {
        if (!Array.isArray(value) || !value.length) {
            return value
        }

        // An unreadable date counts as the oldest, so the comparison stays consistent.
        const time = (item: T) => new Date(String((item as Record<string, unknown>)[property])).getTime() || 0
        const id = (item: T) => Number((item as Record<string, unknown>)['id'] ?? 0)

        return [...value].sort((a, b) => {
            const newestFirst = time(b) - time(a) || id(b) - id(a)
            return order === 'desc' ? -newestFirst : newestFirst
        })
    }
}
