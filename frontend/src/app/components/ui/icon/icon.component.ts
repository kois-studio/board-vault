import { NgComponentOutlet } from '@angular/common'
import { Component, computed, effect, input, signal, Type } from '@angular/core'

type LucideModule = typeof import('@lucide/angular')
type IconType = Type<unknown>
const LUCIDE_MODULE = import('@lucide/angular')

const ICON_EXPORTS: Record<string, keyof LucideModule> = {
    'arrow-left': 'LucideArrowLeft',
    'arrow-right': 'LucideArrowRight',
    'chevron-down': 'LucideChevronDown',
    ban: 'LucideBan',
    bell: 'LucideBell',
    'book-plus': 'LucideBookPlus',
    bookmark: 'LucideBookmark',
    'bookmark-check': 'LucideBookmarkCheck',
    'calendar-heart': 'LucideCalendarHeart',
    calendar: 'LucideCalendar',
    'calendar-check': 'LucideCalendarCheck',
    'calendar-clock': 'LucideCalendarClock',
    'calendar-plus': 'LucideCalendarPlus',
    camera: 'LucideCamera',
    check: 'LucideCheck',
    'chevron-right': 'LucideChevronRight',
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
    lightbulb: 'LucideLightbulb',
    lock: 'LucideLockKeyhole',
    logout: 'LucideLogOut',
    mail: 'LucideMail',
    'mail-plus': 'LucideMailPlus',
    menu: 'LucideMenu',
    moon: 'LucideMoon',
    music: 'LucideMusic2',
    'notebook-pen': 'LucideNotebookPen',
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
    'thumbs-down': 'LucideThumbsDown',
    'thumbs-up': 'LucideThumbsUp',
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
    imports: [NgComponentOutlet],
    template: '<ng-container *ngComponentOutlet="iconComponent(); inputs: iconInputs()" />',
})
export class IconComponent {
    readonly name = input.required<string>()
    readonly size = input<number | string>(20)
    readonly strokeWidth = input<number | string>(2)
    readonly fill = input('none')
    readonly label = input<string | null>(null)
    readonly className = input('')

    public readonly iconComponent = signal<IconType | null>(null)

    public readonly iconInputs = computed(() => ({
        class: `${this.className()} ${this.fill() === 'none' ? 'fill-none' : 'fill-current'}`.trim(),
        size: this.size(),
        strokeWidth: this.strokeWidth(),
        title: this.label(),
    }))

    private readonly normalizedName = computed(() => {
        const value = String(this.name()).replace(/^bi-/, '').replace(/^fa-/, '')
        return LEGACY_ALIASES[value] ?? value
    })

    constructor() {
        effect(() => void this.loadIcon(this.normalizedName()))
    }

    private async loadIcon(normalizedName: string): Promise<void> {
        const lucide = await LUCIDE_MODULE
        const exportName = ICON_EXPORTS[normalizedName] ?? 'LucideCircleQuestionMark'

        // Ignore a load that finished after the name changed again.
        if (this.normalizedName() === normalizedName) {
            this.iconComponent.set(lucide[exportName] as unknown as IconType)
        }
    }
}
