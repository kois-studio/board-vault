import { CurrencyPipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupCollectionType, GroupStandingType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { DataService } from '../../core/services/data.service'
import { initialsAvatar } from '../../core/utils/initialsAvatar'

/**
 * One person in a group, member or not: the games they bring to the group's shelf, roughly what
 * that shelf is worth at retail price (ADR-0016), and how they do on game nights. Reached from the
 * group page; `/groups/:groupId/members/:accountId` or `/groups/:groupId/people/:personId`.
 */
@Component({
    selector: 'app-group-person-page',
    imports: [
        ButtonComponent,
        ContainerWrapperComponent,
        CurrencyPipe,
        IconComponent,
        ImageBackgroundComponent,
        ImageProfileComponent,
        RouterLink,
        SpinnerComponent,
    ],
    templateUrl: './group-person-page.component.html',
})
export class GroupPersonPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true })

    public readonly groupId = computed(() => Number(this.params().get('groupId')))
    private readonly accountId = computed(() => (this.params().has('accountId') ? Number(this.params().get('accountId')) : null))
    private readonly personId = computed(() => (this.params().has('personId') ? Number(this.params().get('personId')) : null))

    public readonly collection = signal<GroupCollectionType | null>(null)
    private readonly standings = signal<Array<GroupStandingType>>([])
    public readonly isLoading = signal(true)
    public readonly loadError = signal(false)
    /** Game nights are a detail of the page: if they fail, the collection still shows. */
    public readonly standingsError = signal(false)

    /** Null until the groups arrive, as on a link opened directly. */
    public readonly groupName = computed(() => this.dataService.userGroups().find((group) => group.id === this.groupId())?.name ?? null)
    public readonly person = computed(
        () =>
            this.collection()?.people.find((person) =>
                this.accountId() !== null ? person.accountId === this.accountId() : person.groupPersonId === this.personId(),
            ) ?? null,
    )
    /** Their line in the group's standings, matched the way the standings count people. */
    public readonly standing = computed(() => {
        const person = this.person()
        if (!person) return null
        return (
            this.standings().find((standing) =>
                person.accountId !== null ? standing.accountId === person.accountId : standing.groupPersonId === person.groupPersonId,
            ) ?? null
        )
    })
    public readonly initialsAvatar = initialsAvatar

    constructor() {
        void this.load()
    }

    public async load(): Promise<void> {
        this.isLoading.set(true)
        this.loadError.set(false)
        const [collection] = await Promise.allSettled([firstValueFrom(this.api.getGroupCollection(this.groupId())), this.loadStandings()])
        if (collection.status === 'fulfilled') this.collection.set(collection.value)
        else this.loadError.set(true)
        this.isLoading.set(false)
    }

    public async loadStandings(): Promise<void> {
        this.standingsError.set(false)
        try {
            const insights = await firstValueFrom(this.api.getGroupInsights(this.groupId()))
            this.standings.set(insights.standings)
        } catch {
            this.standingsError.set(true)
        }
    }
}
