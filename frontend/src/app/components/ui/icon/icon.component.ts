import { NgComponentOutlet } from '@angular/common'
import { Component, Input, Type } from '@angular/core'
import {
    LucideArrowLeft,
    LucideArrowRight,
    LucideBadgeCheck,
    LucideBell,
    LucideBookmark,
    LucideCalendar,
    LucideCheck,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideCircleCheck,
    LucideCirclePlus,
    LucideCircleQuestionMark,
    LucideCircleUserRound,
    LucideCircleX,
    LucideClock,
    LucideDatabase,
    LucideDices,
    LucideEllipsis,
    LucideFileText,
    LucideGamepad2,
    LucideHeart,
    LucideImage,
    LucideInfo,
    LucideLayoutDashboard,
    LucideLayoutPanelLeft,
    LucideLibrary,
    LucideListFilter,
    LucideLoaderCircle,
    LucideLogOut,
    LucideMail,
    LucideMenu,
    LucideMoon,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideShield,
    LucideShieldCheck,
    LucideSparkles,
    LucideStar,
    LucideTrash,
    LucideUser,
    LucideUserPlus,
    LucideUsers,
    LucideX,
    LucideZap,
} from '@lucide/angular'

type IconType = Type<unknown>

const ICONS: Record<string, IconType> = {
    'arrow-left': LucideArrowLeft,
    'arrow-right': LucideArrowRight,
    'badge-check': LucideBadgeCheck,
    bell: LucideBell,
    bookmark: LucideBookmark,
    calendar: LucideCalendar,
    check: LucideCheck,
    'circle-alert': LucideCircleAlert,
    'circle-check': LucideCircleCheck,
    'circle-help': LucideCircleQuestionMark,
    'circle-plus': LucideCirclePlus,
    'circle-user': LucideCircleUserRound,
    'circle-x': LucideCircleX,
    'chevron-down': LucideChevronDown,
    'chevron-left': LucideChevronLeft,
    'chevron-right': LucideChevronRight,
    clock: LucideClock,
    database: LucideDatabase,
    dice: LucideDices,
    ellipsis: LucideEllipsis,
    'file-text': LucideFileText,
    filter: LucideListFilter,
    gamepad: LucideGamepad2,
    heart: LucideHeart,
    image: LucideImage,
    info: LucideInfo,
    layout: LucideLayoutDashboard,
    'layout-sidebar': LucideLayoutPanelLeft,
    library: LucideLibrary,
    loader: LucideLoaderCircle,
    logout: LucideLogOut,
    mail: LucideMail,
    menu: LucideMenu,
    moon: LucideMoon,
    pencil: LucidePencil,
    plus: LucidePlus,
    refresh: LucideRefreshCw,
    search: LucideSearch,
    settings: LucideSettings,
    shield: LucideShield,
    'shield-check': LucideShieldCheck,
    sparkle: LucideSparkles,
    star: LucideStar,
    trash: LucideTrash,
    user: LucideUser,
    'user-plus': LucideUserPlus,
    users: LucideUsers,
    x: LucideX,
    zap: LucideZap,
}

const LEGACY_ALIASES: Record<string, string> = {
    'arrow-repeat': 'refresh',
    'bell-fill': 'bell',
    'bookmark-check-fill': 'bookmark',
    'check-circle': 'circle-check',
    'check-circle-fill': 'circle-check',
    'check-lg': 'check',
    'clock-fill': 'clock',
    envelope: 'mail',
    'envelope-check': 'mail',
    'envelope-check-fill': 'mail',
    'envelope-plus': 'mail',
    'exclamation-circle-fill': 'circle-alert',
    'exclamation-triangle-fill': 'circle-alert',
    'file-earmark-text': 'file-text',
    'filter-fill': 'filter',
    'gamepad-fill': 'gamepad',
    'info-circle-fill': 'info',
    'layout-sidebar': 'layout-sidebar',
    'person-circle': 'circle-user',
    'person-plus': 'user-plus',
    people: 'users',
    'people-fill': 'users',
    'plus-circle-fill': 'circle-plus',
    search: 'search',
    'shield-lock-fill': 'shield',
    'star-fill': 'star',
    trash3: 'trash',
    'x-circle': 'circle-x',
    'x-lg': 'x',
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
