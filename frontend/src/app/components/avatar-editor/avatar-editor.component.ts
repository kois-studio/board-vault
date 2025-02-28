import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import type { UserType } from '../../api/api.types'
@Component({
    selector: 'app-avatar-editor',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './avatar-editor.component.html',
    styleUrls: ['./avatar-editor.component.scss'],
})
export class AvatarEditorComponent implements OnInit {
    @Input({ required: true }) avatar!: UserType['avatar']

    @Output() configChange = new EventEmitter<UserType['avatar']>()

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
        this.activeTab = this.avatar.type
    }

    get filteredIcons(): string[] {
        return this.bootstrapIcons.filter((icon) => icon.toLowerCase().includes(this.searchTerm.toLowerCase()))
    }

    selectColor(color: string): void {
        this.avatar.backgroundColor = color
        this.emitChange()
    }

    selectIcon(iconName: string): void {
        this.avatar.iconName = iconName
        this.avatar.emoji = null
        this.avatar.type = 'icon'
        this.emitChange()
    }

    selectEmoji(emoji: string): void {
        this.avatar.emoji = emoji
        this.avatar.iconName = null
        this.avatar.type = 'emoji'
        this.emitChange()
    }

    setInitials(initials: string): void {
        this.avatar.initials = initials.substring(0, 2).toUpperCase()
        this.avatar.iconName = null
        this.avatar.emoji = null
        this.avatar.type = 'initials'
        this.emitChange()
    }

    switchTab(tab: 'icon' | 'emoji' | 'initials'): void {
        this.activeTab = tab
    }

    emitChange(): void {
        this.configChange.emit({ ...this.avatar })
    }
}
