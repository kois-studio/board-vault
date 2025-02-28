import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'

export interface AvatarConfig {
    backgroundColor: string
    iconName: string | null
    emoji: string | null
    type: 'icon' | 'emoji' | 'initials'
    initials?: string
}

@Component({
    selector: 'app-avatar-editor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './avatar-editor.component.html',
    styleUrls: ['./avatar-editor.component.scss'],
})
export class AvatarEditorComponent implements OnInit {
    @Input() initialConfig: AvatarConfig = {
        backgroundColor: '#6366F1', // Indigo-500
        iconName: 'person-fill',
        emoji: null,
        type: 'icon',
    }

    @Output() configChange = new EventEmitter<AvatarConfig>()

    avatarConfig!: AvatarConfig
    activeTab: 'icon' | 'emoji' | 'initials' = 'icon'
    searchTerm = ''

    // Curated color palette
    colorPalette = [
        '#EF4444', // Red-500
        '#F97316', // Orange-500
        '#F59E0B', // Amber-500
        '#10B981', // Emerald-500
        '#06B6D4', // Cyan-500
        '#3B82F6', // Blue-500
        '#6366F1', // Indigo-500
        '#8B5CF6', // Violet-500
        '#EC4899', // Pink-500
        '#6B7280', // Gray-500
        '#1F2937', // Gray-800
        '#0F172A', // Slate-900
    ]

    // Sample Bootstrap icons (add more as needed)
    bootstrapIcons = [
        'person-fill',
        'house-fill',
        'star-fill',
        'heart-fill',
        'lightning-fill',
        'cloud-fill',
        'peace-fill',
        'graph-up',
        'cup-hot-fill',
        'bookmark-fill',
        'palette-fill',
        'camera-fill',
        'music-note-beamed',
        'puzzle-fill',
        'globe',
        'award-fill',
        'briefcase-fill',
        'chat-dots-fill',
        'code-slash',
        'cpu-fill',
    ]

    // Common emojis
    emojis = ['😀', '😎', '🚀', '💼', '💻', '📱', '🎮', '🎨', '📚', '🎵', '🏆', '💡', '🔍', '⚙️', '🛠️', '📊', '📈', '🌟', '🔥', '✨']

    ngOnInit(): void {
        this.avatarConfig = { ...this.initialConfig }
        this.activeTab = this.avatarConfig.type
    }

    get filteredIcons(): string[] {
        return this.bootstrapIcons.filter((icon) => icon.toLowerCase().includes(this.searchTerm.toLowerCase()))
    }

    selectColor(color: string): void {
        this.avatarConfig.backgroundColor = color
        this.emitChange()
    }

    selectIcon(iconName: string): void {
        this.avatarConfig.iconName = iconName
        this.avatarConfig.emoji = null
        this.avatarConfig.type = 'icon'
        this.emitChange()
    }

    selectEmoji(emoji: string): void {
        this.avatarConfig.emoji = emoji
        this.avatarConfig.iconName = null
        this.avatarConfig.type = 'emoji'
        this.emitChange()
    }

    setInitials(initials: string): void {
        this.avatarConfig.initials = initials.substring(0, 2).toUpperCase()
        this.avatarConfig.iconName = null
        this.avatarConfig.emoji = null
        this.avatarConfig.type = 'initials'
        this.emitChange()
    }

    switchTab(tab: 'icon' | 'emoji' | 'initials'): void {
        this.activeTab = tab
    }

    emitChange(): void {
        this.configChange.emit({ ...this.avatarConfig })
    }
}
