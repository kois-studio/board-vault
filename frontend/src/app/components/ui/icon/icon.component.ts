import { NgComponentOutlet } from '@angular/common'
import { Component, Input, Type } from '@angular/core'
import {
    LucideArrowLeft,
    LucideArrowRight,
    LucideBan,
    LucideBell,
    LucideBookPlus,
    LucideBookmark,
    LucideBookmarkCheck,
    LucideCalendarHeart,
    LucideCalendarPlus,
    LucideCheck,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCirclePlus,
    LucideCircleQuestionMark,
    LucideCircleX,
    LucideClock,
    LucideDices,
    LucideFileText,
    LucideFilter,
    LucideGamepad2,
    LucideGlobe2,
    LucideHeart,
    LucideHeartOff,
    LucideHistory,
    LucideInfo,
    LucideLibrary,
    LucideLoaderCircle,
    LucideLockKeyhole,
    LucideLogOut,
    LucideMail,
    LucideMailPlus,
    LucideMoon,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideShieldAlert,
    LucideShieldLock,
    LucideShoppingBag,
    LucideSparkles,
    LucideStar,
    LucideStarHalf,
    LucideSun,
    LucideTrash,
    LucideTriangleAlert,
    LucideUserCheck,
    LucideUserCircle,
    LucideUserPlus,
    LucideUsers,
    LucideX,
} from '@lucide/angular'

type IconType = Type<unknown>

const ICONS: Record<string, IconType> = {
    'arrow-left': LucideArrowLeft,
    'arrow-right': LucideArrowRight,
    ban: LucideBan,
    bell: LucideBell,
    'circle-alert': LucideCircleAlert,
    'circle-check': LucideCircleCheck,
    'circle-help': LucideCircleQuestionMark,
    'circle-plus': LucideCirclePlus,
    'circle-x': LucideCircleX,
    clock: LucideClock,
    'calendar-heart': LucideCalendarHeart,
    'calendar-plus': LucideCalendarPlus,
    check: LucideCheck,
    dice: LucideDices,
    filter: LucideFilter,
    'file-text': LucideFileText,
    'book-plus': LucideBookPlus,
    bookmark: LucideBookmark,
    'bookmark-check': LucideBookmarkCheck,
    gamepad: LucideGamepad2,
    globe: LucideGlobe2,
    history: LucideHistory,
    heart: LucideHeart,
    'heart-off': LucideHeartOff,
    info: LucideInfo,
    loader: LucideLoaderCircle,
    lock: LucideLockKeyhole,
    library: LucideLibrary,
    logout: LucideLogOut,
    mail: LucideMail,
    'mail-plus': LucideMailPlus,
    moon: LucideMoon,
    plus: LucidePlus,
    pencil: LucidePencil,
    refresh: LucideRefreshCw,
    search: LucideSearch,
    settings: LucideSettings,
    'shield-lock': LucideShieldLock,
    'shield-alert': LucideShieldAlert,
    'shopping-bag': LucideShoppingBag,
    sparkle: LucideSparkles,
    star: LucideStar,
    'star-half': LucideStarHalf,
    sun: LucideSun,
    trash: LucideTrash,
    'triangle-alert': LucideTriangleAlert,
    'user-circle': LucideUserCircle,
    'user-check': LucideUserCheck,
    'user-plus': LucideUserPlus,
    users: LucideUsers,
    x: LucideX,
}

const LEGACY_ALIASES: Record<string, string> = {
    'arrow-repeat': 'refresh',
    'box-arrow-right': 'arrow-right',
    'gear-fill': 'settings',
    lightbulb: 'sparkle',
    'clock-fill': 'clock',
    'people-fill': 'users',
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
    @Input() fill = 'none'
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
            fill: this.fill,
            title: this.label,
        }
    }

    private get normalizedName(): string {
        const value = this.name.replace(/^bi-/, '').replace(/^fa-/, '')
        return LEGACY_ALIASES[value] ?? value
    }
}
