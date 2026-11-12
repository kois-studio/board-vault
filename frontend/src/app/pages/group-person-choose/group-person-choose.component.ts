import { HttpErrorResponse } from '@angular/common/http'
import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupPersonChoiceType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ToastService } from '../../components/toast/toast.service'
import { BackLinkComponent } from '../../components/ui/back-link/back-link.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { formatDateTime, formatList, intlLocale } from '../../core/i18n/format'
import { DataService } from '../../core/services/data.service'
import { initialsAvatar } from '../../core/utils/initialsAvatar'

/** How many game titles a choice names before "and N more". */
const NAMED_GAMES = 3

/** Stored times are UTC, with or without a zone ("2026-10-16 18:30:00"). */
function storedTime(value: string): number {
    return new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime()
}

/**
 * "Who are you in this group?" (#278, ADR-0027). Someone who joined a group that recorded people before they had an
 * account picks which of them they are, the one an invitation suggested first, or says they are new. Picking one opens
 * the review page, where they keep what is theirs before taking it over.
 */
@Component({
    imports: [BackLinkComponent, ButtonComponent, ImageProfileComponent, RouterLink],
    templateUrl: './group-person-choose.component.html',
})
export class GroupPersonChooseComponent {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly toastService = inject(ToastService)
    private readonly dataService = inject(DataService)
    public readonly route = inject(ActivatedRoute)

    public readonly groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)
    public readonly isLoading = signal(true)
    /** Board Vault did not answer: Retry, never "I'm new here", which would decide who you are for you. */
    public readonly loadFailed = signal(false)
    /** 403/404: not a member of this group, or it is gone. */
    public readonly unavailable = signal(false)
    public readonly isSaving = signal(false)
    public readonly choices = signal<Array<GroupPersonChoiceType>>([])
    public readonly groupName = computed(() => this.dataService.userGroups().find((group) => group.id === this.groupId)?.name ?? null)
    public readonly initialsAvatar = initialsAvatar

    constructor() {
        void this.load()
    }

    public retry(): void {
        if (!this.isLoading()) void this.load()
    }

    /** "Owns Catan, Azul, Carcassonne and 2 more games", or null without games. */
    public gamesLine(choice: GroupPersonChoiceType): string | null {
        const titles = choice.games.map(
            (game) =>
                game.title ?? $localize`:Name shown for a game whose title is missing; the placeholder is its number:Game #${game.id}:id:`,
        )
        if (titles.length === 0) return null
        const more = titles.length - NAMED_GAMES
        const named =
            more <= 0
                ? titles
                : [
                      ...titles.slice(0, NAMED_GAMES),
                      new Intl.PluralRules(intlLocale()).select(more) === 'one'
                          ? $localize`:more games, one|Last item of the list of a person's games on the page where you say who you are in a group, after three titles:${more}:count: more game`
                          : $localize`:more games, other|Last item of the list of a person's games on the page where you say who you are in a group, after three titles:${more}:count: more games`,
                  ]
        return $localize`:On the page where you say who you are in a group, the games recorded for a person; games is a list of game titles:Owns ${formatList(named)}:games:`
    }

    /** "Came to 4 game nights, the last on 30 Oct 2026". */
    public nightsLine(choice: GroupPersonChoiceType): string {
        if (choice.nights === 0 || !choice.lastNight) {
            return $localize`:On the page where you say who you are in a group, for a person who came to no game night yet:No game nights recorded yet`
        }
        const last = formatDateTime(storedTime(choice.lastNight), { day: 'numeric', month: 'short', year: 'numeric' })
        const count = choice.nights
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:nights came to, one|On the page where you say who you are in a group; count is a number of game nights, date the day of the last one:Came to ${count}:count: game night, on ${last}:date:`
            : $localize`:nights came to, other|On the page where you say who you are in a group; count is a number of game nights, date the day of the last one:Came to ${count}:count: game nights, the last on ${last}:date:`
    }

    public thisIsMeLabel(name: string): string {
        return $localize`:Name of the This is me button for screen readers, on the page where you say who you are in a group; name is a person's name:This is me: ${name}:name:`
    }

    public async joinAsNew(): Promise<void> {
        if (this.isSaving() || Number.isNaN(this.groupId)) return
        this.isSaving.set(true)
        try {
            await firstValueFrom(this.api.joinGroupAsNewPerson(this.groupId))
            this.dataService.refreshUserGroups()
            this.toastService.success(
                $localize`:Toast after joining a group as a new person instead of taking over one prepared for you:You joined the group as a new person.`,
            )
            await this.router.navigate(['/groups', this.groupId])
        } catch {
            this.toastService.error(
                $localize`:Error when joining a group as a new person fails:We could not add you as a new group person. Please try again.`,
            )
        } finally {
            this.isSaving.set(false)
        }
    }

    private async load(): Promise<void> {
        if (Number.isNaN(this.groupId)) {
            this.unavailable.set(true)
            this.isLoading.set(false)
            return
        }
        this.isLoading.set(true)
        try {
            this.choices.set(await firstValueFrom(this.api.getGroupPersonChoices(this.groupId)))
            this.loadFailed.set(false)
            this.unavailable.set(false)
        } catch (error) {
            const denied = error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404)
            this.unavailable.set(denied)
            this.loadFailed.set(!denied)
        } finally {
            this.isLoading.set(false)
        }
    }
}
