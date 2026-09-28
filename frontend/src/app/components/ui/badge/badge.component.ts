import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TailwindColor } from '../../../types/tailwind.type'

@Component({
    imports: [CommonModule],
    selector: 'app-badge',
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    @Input() showIndicator = false
    @Input() color: TailwindColor = 'indigo'
    @Input({ required: true }) text!: string | number

    public get indicatorClass(): string {
        const classes: Record<TailwindColor, string> = {
            red: 'bg-red-600',
            orange: 'bg-orange-600',
            amber: 'bg-amber-600',
            yellow: 'bg-yellow-600',
            lime: 'bg-lime-600',
            green: 'bg-green-600',
            emerald: 'bg-emerald-600',
            teal: 'bg-teal-600',
            cyan: 'bg-cyan-600',
            sky: 'bg-sky-600',
            blue: 'bg-blue-600',
            indigo: 'bg-indigo-600',
            violet: 'bg-violet-600',
            purple: 'bg-purple-600',
            fuchsia: 'bg-fuchsia-600',
            pink: 'bg-pink-600',
            rose: 'bg-rose-600',
            slate: 'bg-slate-600',
            gray: 'bg-gray-600',
            zinc: 'bg-zinc-600',
            neutral: 'bg-neutral-600',
            stone: 'bg-stone-600',
        }

        return classes[this.color] ?? classes.indigo
    }
}
