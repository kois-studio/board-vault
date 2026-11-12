import { CurrencyPipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupCollectionType, GroupPersonTakeoverType, GroupStandingType } from '../../api/api.types'
import { AddPersonGameComponent } from '../../components/add-person-game/add-person-game.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ToastService } from '../../components/toast/toast.service'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { formatDateTime } from '../../core/i18n/format'
import { GameTitlePipe } from '../../core/pipes/game-title.pipe'
import { DataService } from '../../core/services/data.service'
import { gameTitleLanguage } from '../../core/utils/gameTitle'
import { initialsAvatar } from '../../core/utils/initialsAvatar'

/**
 * One person in a group, member or not: the games they bring to the group's shelf, roughly what
 * that shelf is worth at retail price (ADR-0016), and how they do on game nights. Reached from the
 * group page; `/groups/:groupId/members/:accountId` or `/groups/:groupId/people/:personId`.
 */
@Component({
    selector: 'app-group-person-page',
    imports: [
        AddPersonGameComponent,
        ButtonComponent,
        ContainerWrapperComponent,
        CurrencyPipe,
        GameTitlePipe,
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
    private readonly toastService = inject(ToastService)
    private readonly params = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true })

    protected readonly titleLanguage = gameTitleLanguage

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
    public readonly ownedIds = computed(() => this.person()?.games.map((game) => game.id) ?? [])
    public readonly isMe = computed(() => this.person()?.accountId === this.dataService.currentUser()?.id)
    public readonly initialsAvatar = initialsAvatar

    /** Takeovers the group can still undo (ADR-0027); a detail of the page, so failing to load them hides nothing else. */
    private readonly takeovers = signal<Array<GroupPersonTakeoverType>>([])
    /** This member's takeover of someone, while it can be undone: a member is one person per group, so the account says which. */
    public readonly takeover = computed(() => {
        const person = this.person()
        if (!person || person.accountId === null) return null
        return this.takeovers().find((takeover) => takeover.accountId === person.accountId) ?? null
    })
    public readonly confirmingUndo = signal(false)
    public readonly undoing = signal(false)
    public readonly undoError = signal(false)

    /** "11 Nov 2026" for a stored UTC time. */
    public storedDay(value: string): string {
        return formatDateTime(new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    public async undoTakeover(): Promise<void> {
        const takeover = this.takeover()
        if (!takeover || this.undoing()) return
        if (!this.confirmingUndo()) {
            this.confirmingUndo.set(true)
            return
        }
        this.undoing.set(true)
        this.undoError.set(false)
        try {
            await firstValueFrom(this.api.undoGroupPersonTakeover(this.groupId(), takeover.groupPersonId))
            this.confirmingUndo.set(false)
            // The person is back without an account and the taker is a new person: the group's people changed.
            this.dataService.refreshUserGroups()
            this.toastService.success(
                $localize`:Toast after undoing a takeover in a group; name is the name the person gets back:${takeover.previousName}:name: is back as before.`,
            )
            await this.load()
        } catch {
            this.undoError.set(true)
        } finally {
            this.undoing.set(false)
        }
    }

    constructor() {
        void this.load()
    }

    public async load(): Promise<void> {
        this.isLoading.set(true)
        this.loadError.set(false)
        const [collection] = await Promise.allSettled([
            firstValueFrom(this.api.getGroupCollection(this.groupId())),
            this.loadStandings(),
            this.loadTakeovers(),
        ])
        if (collection.status === 'fulfilled') this.collection.set(collection.value)
        else this.loadError.set(true)
        this.isLoading.set(false)
    }

    private async loadTakeovers(): Promise<void> {
        try {
            this.takeovers.set(await firstValueFrom(this.api.getGroupPersonTakeovers(this.groupId())))
        } catch {
            this.takeovers.set([])
        }
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
