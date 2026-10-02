import { CommonModule } from '@angular/common'
import { Component, computed, input } from '@angular/core'
import { UserType } from '../../api/api.types'
import { playerColourStyle } from '../../core/utils/playerColour'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'app-image-profile',
    templateUrl: 'image-profile.component.html',
})
export class ImageProfileComponent {
    readonly avatar = input.required<null | undefined | UserType['avatar']>()
    readonly size = input<'base' | 'large'>('base')

    protected readonly colours = computed(() => playerColourStyle(this.avatar()?.backgroundColor))
}
