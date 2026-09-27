import { NgComponentOutlet } from '@angular/common'
import { Component, Input, Type } from '@angular/core'
import {
    LucideArrowLeft,
    LucideArrowRight,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCirclePlus,
    LucideCircleQuestionMark,
    LucideCircleX,
    LucideLoaderCircle,
    LucidePlus,
    LucideRefreshCw,
    LucideSettings,
    LucideSparkles,
    LucideX,
} from '@lucide/angular'

type IconType = Type<unknown>

const ICONS: Record<string, IconType> = {
    'arrow-left': LucideArrowLeft,
    'arrow-right': LucideArrowRight,
    'circle-alert': LucideCircleAlert,
    'circle-check': LucideCircleCheck,
    'circle-help': LucideCircleQuestionMark,
    'circle-plus': LucideCirclePlus,
    'circle-x': LucideCircleX,
    loader: LucideLoaderCircle,
    plus: LucidePlus,
    refresh: LucideRefreshCw,
    settings: LucideSettings,
    sparkle: LucideSparkles,
    x: LucideX,
}

const LEGACY_ALIASES: Record<string, string> = {
    'arrow-repeat': 'refresh',
    'box-arrow-right': 'arrow-right',
    'gear-fill': 'settings',
    lightbulb: 'sparkle',
    'plus-lg': 'plus',
    'x-circle': 'circle-x',
}

@Component({
    selector: 'app-icon',
    standalone: true,
    imports: [NgComponentOutlet],
    template: '<ng-container *ngComponentOutlet="iconComponent; inputs: iconInputs" />',
})
export class IconComponent {
    @Input({ required: true }) name = 'circle-help'
    @Input() size: number | string = 20
    @Input() strokeWidth: number | string = 2
    @Input() label: string | null = null
    @Input() className = ''

    get iconComponent(): IconType {
        return ICONS[this.normalizedName] ?? LucideCircleQuestionMark
    }

    get iconInputs(): Record<string, unknown> {
        return {
            class: this.className,
            size: this.size,
            strokeWidth: this.strokeWidth,
            title: this.label,
        }
    }

    private get normalizedName(): string {
        const value = this.name.replace(/^bi-/, '').replace(/^fa-/, '')
        return LEGACY_ALIASES[value] ?? value
    }
}
