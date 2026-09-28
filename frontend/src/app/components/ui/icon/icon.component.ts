import { NgComponentOutlet } from '@angular/common'
import { Component, Input, OnChanges, Type, signal } from '@angular/core'

type LucideModule = typeof import('@lucide/angular')
type IconType = Type<unknown>
const LUCIDE_MODULE = import('@lucide/angular')

const ICON_EXPORTS: Record<string, keyof LucideModule> = {
    'arrow-left': 'LucideArrowLeft',
    'arrow-right': 'LucideArrowRight',
    ban: 'LucideBan',
    bell: 'LucideBell',
    'book-plus': 'LucideBookPlus',
    bookmark: 'LucideBookmark',
    'bookmark-check': 'LucideBookmarkCheck',
    'calendar-heart': 'LucideCalendarHeart',
    calendar: 'LucideCalendar',
    'calendar-plus': 'LucideCalendarPlus',
    camera: 'LucideCamera',
    check: 'LucideCheck',
    cloud: 'LucideCloud',
    coffee: 'LucideCoffee',
    'circle-alert': 'LucideCircleAlert',
    'circle-check': 'LucideCircleCheck',
    'circle-help': 'LucideCircleQuestionMark',
    'circle-plus': 'LucideCirclePlus',
    'circle-x': 'LucideCircleX',
    clock: 'LucideClock',
    dice: 'LucideDices',
    dices: 'LucideDices',
    'dice-5': 'LucideDice5',
    filter: 'LucideFilter',
    'file-text': 'LucideFileText',
    gamepad: 'LucideGamepad2',
    globe: 'LucideGlobe2',
    hand: 'LucideHand',
    history: 'LucideHistory',
    heart: 'LucideHeart',
    'heart-off': 'LucideHeartOff',
    home: 'LucideHome',
    image: 'LucideImage',
    info: 'LucideInfo',
    languages: 'LucideLanguages',
    library: 'LucideLibrary',
    loader: 'LucideLoaderCircle',
    lock: 'LucideLockKeyhole',
    logout: 'LucideLogOut',
    mail: 'LucideMail',
    'mail-plus': 'LucideMailPlus',
    menu: 'LucideMenu',
    moon: 'LucideMoon',
    music: 'LucideMusic2',
    'panel-left': 'LucidePanelLeft',
    palette: 'LucidePalette',
    pencil: 'LucidePencil',
    plus: 'LucidePlus',
    refresh: 'LucideRefreshCw',
    search: 'LucideSearch',
    settings: 'LucideSettings',
    'shield-alert': 'LucideShieldAlert',
    'shield-lock': 'LucideShieldLock',
    'shopping-bag': 'LucideShoppingBag',
    sparkle: 'LucideSparkles',
    star: 'LucideStar',
    'star-half': 'LucideStarHalf',
    sun: 'LucideSun',
    trash: 'LucideTrash',
    trending: 'LucideTrendingUp',
    'triangle-alert': 'LucideTriangleAlert',
    'user-check': 'LucideUserCheck',
    'user-circle': 'LucideUserCircle',
    'user-plus': 'LucideUserPlus',
    users: 'LucideUsers',
    x: 'LucideX',
    zap: 'LucideZap',
}

const LEGACY_ALIASES: Record<string, string> = {
    'arrow-repeat': 'refresh',
    'box-arrow-left': 'logout',
    'box-arrow-right': 'arrow-right',
    calendar3: 'calendar',
    'calendar-check-fill': 'calendar-plus',
    'camera-fill': 'camera',
    'clock-fill': 'clock',
    'clock-history': 'history',
    'collection-fill': 'library',
    dice: 'dices',
    'dice-5-fill': 'dice-5',
    'file-earmark-plus': 'file-text',
    files: 'file-text',
    grid: 'library',
    'hand-thumbs-up': 'circle-check',
    'gear-fill': 'settings',
    'graph-up': 'trending',
    'heart-fill': 'heart',
    'house-fill': 'home',
    lightbulb: 'sparkle',
    'lightning-fill': 'zap',
    'music-note-beamed': 'music',
    'palette-fill': 'palette',
    'person-fill': 'user-circle',
    'puzzle-fill': 'gamepad',
    'peace-fill': 'hand',
    'people-fill': 'users',
    puzzle: 'gamepad',
    'plus-lg': 'plus',
    'cup-hot-fill': 'coffee',
    'bookmark-fill': 'bookmark',
    'award-fill': 'circle-check',
    'briefcase-fill': 'file-text',
    'chat-dots-fill': 'mail',
    'code-slash': 'info',
    'cpu-fill': 'settings',
    'star-fill': 'star',
    'suit-heart-fill': 'heart',
    tags: 'bookmark',
    'x-circle': 'circle-x',
}

@Component({
    selector: 'app-icon',
    standalone: true,
    imports: [NgComponentOutlet],
    template: '<ng-container *ngComponentOutlet="iconComponent(); inputs: iconInputs" />',
})
export class IconComponent implements OnChanges {
    @Input({ required: true }) name = 'circle-help'
    @Input() size: number | string = 20
    @Input() strokeWidth: number | string = 2
    @Input() fill = 'none'
    @Input() label: string | null = null
    @Input() className = ''

    public readonly iconComponent = signal<IconType | null>(null)
    private loadedName: string | null = null

    constructor() {
        void this.loadIcon()
    }

    ngOnChanges(): void {
        void this.loadIcon()
    }

    get iconInputs(): Record<string, unknown> {
        return {
            class: `${this.className} ${this.fill === 'none' ? 'fill-none' : 'fill-current'}`.trim(),
            size: this.size,
            strokeWidth: this.strokeWidth,
            title: this.label,
        }
    }

    private get normalizedName(): string {
        const value = String(this.name).replace(/^bi-/, '').replace(/^fa-/, '')
        return LEGACY_ALIASES[value] ?? value
    }

    private async loadIcon(): Promise<void> {
        const normalizedName = this.normalizedName
        if (this.loadedName === normalizedName && this.iconComponent()) return

        this.loadedName = normalizedName
        const lucide = await LUCIDE_MODULE
        const exportName = ICON_EXPORTS[normalizedName] ?? ICON_EXPORTS['circle-help']
        const icon = lucide[exportName] as unknown as IconType

        if (this.normalizedName === normalizedName) {
            this.iconComponent.set(icon)
        }
    }
}
