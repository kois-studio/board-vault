import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'sortByDate',
    standalone: true,
})
export class SortByDatePipe implements PipeTransform {
    transform(value: any[], order = 'asc', property = 'createdAt'): any[] {
        if (!Array.isArray(value) || !value.length) {
            return value
        }

        const sortedArray = value.sort((a, b) => {
            const dateA = new Date(a[property]).getTime()
            const dateB = new Date(b[property]).getTime()

            if (order === 'desc') {
                return dateA - dateB
            }
            return dateB - dateA
        })

        return sortedArray
    }
}
