import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, InvitationType, InvitationWithAccountsData, UserType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class DataService {
    public currentUser: WritableSignal<null | UserType> = signal(null)
    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    public userGroups: WritableSignal<Array<GroupWithMembersAndGames>> = signal([])
    public gamesList: WritableSignal<Array<GameType>> = signal([])
    public invitationsReceived: WritableSignal<Array<InvitationType>> = signal([])

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {Invitation[]} has pending)
    public invitationsGroupIndex: WritableSignal<Record<number, Array<InvitationWithAccountsData>>> = signal({})

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly toastService: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {
        effect(() => {
            const token = this.localStorageService.getToken()
            const email = this.localStorageService.getItem('email')
            if (token && email) {
                // 1. Get the user data
                this._getUserData(email)
            }
        })
    }

    private _getUserData(email: string) {
        this.api.getUserByEmail(email).subscribe({
            next: (userType) => {
                this.currentUser.set(userType)

                // 2. Get the user's groups and invitations
                this._getUserGroups(userType.id)
                this._getUserInvitations(userType.id)
            },
            error: (error) => {
                if (error.status === 401) {
                    this.toastService.error('Session expired, please log in again')
                    this.localStorageService.clear()
                    this.currentUser.set(null)
                    this.router.navigate(['/login'])
                    return
                }

                this.toastService.error("Error retrieving user's data")
            },
        })
    }

    private _getUserInvitations(userId: number) {
        this.api.getInvitationsReceived(userId).subscribe({
            next: (invitations) => {
                this.invitationsReceived.set(invitations)
            },
            error: () => {
                this.toastService.error("Error retrieving user's invitations")
            },
        })
    }

    private _getUserGroups(userId: number) {
        this.api
            .getUserGroups(userId)
            .pipe(
                catchError((err) => {
                    this.toastService.error("Error retrieving user's groups")
                    return of([]) // Return an empty array to allow the process to continue
                }),
                concatMap((groupIds) =>
                    from(groupIds).pipe(
                        concatMap((groupId) =>
                            this.api.getGroupWithMembersAndGames(groupId).pipe(
                                tap((group) => {
                                    this.userGroups.update((groups) => [...groups, group])
                                }),
                                catchError((err) => {
                                    this.toastService.error(`Error retrieving group data for groupId: ${groupId}`)
                                    return of(null) // Returning null or empty to continue fetching other groups
                                }),
                                concatMap((group) =>
                                    group
                                        ? this.api.getGroupInvitations(groupId).pipe(
                                              tap((invitations) => {
                                                  this.invitationsGroupIndex.update((index) => ({
                                                      ...index,
                                                      [groupId]: invitations,
                                                  }))
                                              }),
                                              catchError((err) => {
                                                  this.toastService.error(`Error retrieving invitations for groupId: ${groupId}`)
                                                  return of([]) // Return empty invitations to continue
                                              }),
                                          )
                                        : of(null),
                                ),
                            ),
                        ),
                    ),
                ),
            )
            .subscribe()
    }

    // #region ## public methods ##

    // --------------------------------------------------------------------------
    //   These methods are meant to follow this flow:
    //      1. Update the DB
    //      2. Update the local data (without reloading everything)
    //      3. Give feedback to the user with toasts
    // --------------------------------------------------------------------------

    // #region form-update-profile

    public updateCurrentUserData(requestBody: {
        email?: string
        username?: string
        display_name?: string
        imageUrl?: string
    }) {
        const currentUser = this.currentUser()
        if (!currentUser) {
            return
        }

        // 1.
        this.api
            .updateUser(currentUser.id, requestBody)
            .pipe(concatMap((res) => this.api.getUserByEmail(currentUser.email)))
            .subscribe({
                next: (updatedUser) => {
                    // 2.
                    this.currentUser.set(updatedUser)
                    this.userGroups.update((groups) =>
                        groups.map((group) => {
                            const userIndex = group.members.findIndex((member) => member.id === currentUser.id)
                            if (userIndex === -1) return group

                            for (const [key, value] of Object.entries(requestBody) as Array<[keyof typeof requestBody, string]>) {
                                if (requestBody[key] === updatedUser[key]) {
                                    // extra check
                                    group.members[userIndex][key] = value
                                }
                            }
                            return group
                        }),
                    )
                    this.toastService.success('User data updated')
                },
                error: () => {
                    this.toastService.error('Error updating user data')
                },
            })
    }

    // #region group-edit
    public removeMemberFromGroup(groupId: number, memberId: number) {
        this.toastService.info('Removing member from group...')
    }

    public removeInvitedFromGroup(invitationId: number) {
        // 1.
        this.api.deletInvitation(invitationId).subscribe({
            next: (res) => {
                // 2.
                this.invitationsGroupIndex.update((index) => {
                    const groupIds = Object.keys(index).map(Number)
                    for (const groupId of groupIds) {
                        index[groupId] = index[groupId].filter((invitation) => invitation.id !== invitationId)
                    }
                    return index
                })

                // 3.
                this.toastService.success('Invitation removed')
            },
            error: () => {
                this.toastService.error('Error removing invitation')
            },
        })
    }

    public addInvitedToGroup(groupId: number, userId: number, invitedUsername: string) {
        // 1.
        this.api.createInvitation(groupId, userId, invitedUsername).subscribe({
            next: (res) => {
                // 2.
                this.api.getGroupInvitations(groupId).subscribe({
                    next: (invitations) => {
                        this.invitationsGroupIndex.update((index) => ({
                            ...index,
                            [groupId]: invitations,
                        }))

                        // 3.
                        this.toastService.success('Invitation sent')
                    },
                    error: () => {
                        this.toastService.error('Error updating invitations')
                    },
                })
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('User not found')
                }
                this.toastService.error('Error sending invitation')
            },
        })
    }
}
