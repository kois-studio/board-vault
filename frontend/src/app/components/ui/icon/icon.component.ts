import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import {
    ArrowLeft,
    ArrowRight,
    Ban,
    Bell,
    Bookmark,
    BookmarkCheck,
    BookPlus,
    Calendar,
    CalendarCheck,
    CalendarClock,
    CalendarHeart,
    CalendarPlus,
    Camera,
    Check,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    CircleCheck,
    CirclePlus,
    CircleQuestionMark,
    CircleX,
    Clock,
    Cloud,
    CloudOff,
    Coffee,
    Dice5,
    Dices,
    FileText,
    Filter,
    Gamepad2,
    Globe2,
    Hand,
    Heart,
    HeartOff,
    History,
    Home,
    type IconNode,
    Image,
    Info,
    Languages,
    LayoutDashboard,
    Library,
    Lightbulb,
    LoaderCircle,
    LockKeyhole,
    LogOut,
    Mail,
    MailPlus,
    Menu,
    Merge,
    Monitor,
    Moon,
    Music2,
    NotebookPen,
    Palette,
    PanelLeft,
    Pencil,
    Pin,
    Plus,
    RefreshCw,
    Search,
    Settings,
    ShieldAlert,
    ShieldLock,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    Star,
    StarHalf,
    Sun,
    Tag,
    ThumbsDown,
    ThumbsUp,
    Trash,
    TrendingUp,
    TriangleAlert,
    UserCheck,
    UserCircle,
    UserPlus,
    Users,
    X,
    Zap,
} from 'lucide'

// Named imports, so the build keeps only these icons. Importing the whole module
// pulled every Lucide icon (about 6.5 MB) into the first page load. They are data
// (`lucide`), not one Angular component each (`@lucide/angular`), so one template
// draws them all (#110).
const ICON_EXPORTS: Record<string, IconNode> = {
    'arrow-left': ArrowLeft,
    'arrow-right': ArrowRight,
    'chevron-down': ChevronDown,
    ban: Ban,
    bell: Bell,
    'book-plus': BookPlus,
    bookmark: Bookmark,
    'bookmark-check': BookmarkCheck,
    'sliders-horizontal': SlidersHorizontal,
    'calendar-heart': CalendarHeart,
    calendar: Calendar,
    'calendar-check': CalendarCheck,
    'calendar-clock': CalendarClock,
    'calendar-plus': CalendarPlus,
    camera: Camera,
    check: Check,
    'chevron-right': ChevronRight,
    cloud: Cloud,
    'cloud-off': CloudOff,
    coffee: Coffee,
    'circle-alert': CircleAlert,
    'circle-check': CircleCheck,
    'circle-help': CircleQuestionMark,
    'circle-plus': CirclePlus,
    'circle-x': CircleX,
    clock: Clock,
    dice: Dices,
    dices: Dices,
    'dice-5': Dice5,
    filter: Filter,
    'file-text': FileText,
    gamepad: Gamepad2,
    globe: Globe2,
    hand: Hand,
    history: History,
    heart: Heart,
    'heart-off': HeartOff,
    home: Home,
    image: Image,
    info: Info,
    languages: Languages,
    'layout-dashboard': LayoutDashboard,
    library: Library,
    loader: LoaderCircle,
    lightbulb: Lightbulb,
    lock: LockKeyhole,
    logout: LogOut,
    mail: Mail,
    'mail-plus': MailPlus,
    menu: Menu,
    merge: Merge,
    monitor: Monitor,
    moon: Moon,
    music: Music2,
    'notebook-pen': NotebookPen,
    'panel-left': PanelLeft,
    palette: Palette,
    pencil: Pencil,
    pin: Pin,
    plus: Plus,
    refresh: RefreshCw,
    search: Search,
    settings: Settings,
    'shield-alert': ShieldAlert,
    'shield-lock': ShieldLock,
    'shopping-bag': ShoppingBag,
    sparkle: Sparkles,
    star: Star,
    'star-half': StarHalf,
    sun: Sun,
    tag: Tag,
    'thumbs-down': ThumbsDown,
    'thumbs-up': ThumbsUp,
    trash: Trash,
    trending: TrendingUp,
    'triangle-alert': TriangleAlert,
    'user-check': UserCheck,
    'user-circle': UserCircle,
    'user-plus': UserPlus,
    users: Users,
    x: X,
    zap: Zap,
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

/** The SVG elements a Lucide icon is drawn with; an unknown one is skipped. */
const SHAPES = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'])

/**
 * A Lucide icon by name, drawn from its data in one template. The `<svg>` carries the attributes Lucide's own
 * components gave it (24-unit view box, `currentColor` stroke, round caps and joins, `lucide lucide-<name>` classes),
 * and hides from screen readers unless it has a `label`.
 */
@Component({
    selector: 'app-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            [attr.width]="size()"
            [attr.height]="size()"
            [attr.stroke-width]="strokeWidth()"
            [attr.class]="svgClass()"
            [attr.aria-hidden]="label() ? null : 'true'"
            [attr.role]="label() ? 'img' : null"
        >
            @if (label(); as title) {
                <svg:title>{{ title }}</svg:title>
            }
            @for (shape of shapes(); track $index) {
                @let a = shape[1];
                @switch (shape[0]) {
                    @case ('path') {
                        <svg:path [attr.d]="a['d']" [attr.fill]="a['fill']" [attr.stroke]="a['stroke']" [attr.opacity]="a['opacity']" />
                    }
                    @case ('circle') {
                        <svg:circle [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.r]="a['r']" [attr.fill]="a['fill']" [attr.stroke]="a['stroke']" />
                    }
                    @case ('rect') {
                        <svg:rect
                            [attr.x]="a['x']"
                            [attr.y]="a['y']"
                            [attr.width]="a['width']"
                            [attr.height]="a['height']"
                            [attr.rx]="a['rx']"
                            [attr.ry]="a['ry']"
                            [attr.fill]="a['fill']"
                            [attr.stroke]="a['stroke']"
                        />
                    }
                    @case ('line') {
                        <svg:line [attr.x1]="a['x1']" [attr.y1]="a['y1']" [attr.x2]="a['x2']" [attr.y2]="a['y2']" [attr.stroke]="a['stroke']" />
                    }
                    @case ('polyline') {
                        <svg:polyline [attr.points]="a['points']" [attr.fill]="a['fill']" [attr.stroke]="a['stroke']" />
                    }
                    @case ('polygon') {
                        <svg:polygon [attr.points]="a['points']" [attr.fill]="a['fill']" [attr.stroke]="a['stroke']" />
                    }
                    @case ('ellipse') {
                        <svg:ellipse [attr.cx]="a['cx']" [attr.cy]="a['cy']" [attr.rx]="a['rx']" [attr.ry]="a['ry']" [attr.fill]="a['fill']" [attr.stroke]="a['stroke']" />
                    }
                }
            }
        </svg>
    `,
    // The size in rem as well (styles.css), so icons grow with the text size chosen in Settings → Appearance.
    host: { '[style.--icon-size]': 'remSize()' },
})
export class IconComponent {
    readonly name = input.required<string>()
    readonly size = input<number | string>(20)
    readonly strokeWidth = input<number | string>(2)
    readonly fill = input('none')
    readonly label = input<string | null>(null)
    readonly className = input('')

    /** The icon's name as drawn, after legacy aliases; an unknown name draws the help icon. */
    public readonly iconName = computed(() => (ICON_EXPORTS[this.normalizedName()] ? this.normalizedName() : 'circle-help'))

    protected readonly shapes = computed(
        () =>
            (ICON_EXPORTS[this.iconName()] ?? CircleQuestionMark).filter(([tag]) => SHAPES.has(tag)) as Array<
                [string, Record<string, string | number | undefined>]
            >,
    )

    protected readonly svgClass = computed(() =>
        `lucide lucide-${this.iconName()} ${this.className()} ${this.fill() === 'none' ? 'fill-none' : 'fill-current'}`
            .replace(/\s+/g, ' ')
            .trim(),
    )

    /** `size` in rem (16px to the rem), or null when it is not a plain number. */
    public readonly remSize = computed(() => {
        const pixels = Number(this.size())
        return Number.isFinite(pixels) && pixels > 0 ? `${pixels / 16}rem` : null
    })

    private readonly normalizedName = computed(() => {
        const value = String(this.name()).replace(/^bi-/, '').replace(/^fa-/, '')
        return LEGACY_ALIASES[value] ?? value
    })
}
