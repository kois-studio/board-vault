import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GameReviewType,
    GameType,
    GroupWithMembersAndGames,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetType,
    NotificationType,
    UserType,
} from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class DataService {
    public currentUser: WritableSignal<null | UserType> = signal(null)
    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    public userGames: WritableSignal<Array<GameType>> = signal([])
    public userGroups: WritableSignal<Array<GroupWithMembersAndGames>> = signal([])
    public userNotifications: WritableSignal<Array<NotificationType>> = signal([])
    public userInvitations: WritableSignal<Array<InvitationWithExtraData>> = signal([])
    public userReviews: WritableSignal<Array<GameReviewType>> = signal([])
    public userMeets: WritableSignal<Array<MeetType>> = signal([])

    // list of all games available to select
    public gamesList: WritableSignal<Array<GameType>> = signal([])

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
                this._getUserNotifications(userType.id)
                this._getUserReviews(userType.id)
                this._getUserMeets(userType.id)
            },
            error: (error) => {
                if (error.status === 401) {
                    this.toastService.error('Your session has expired, please log in again')
                    this.localStorageService.clear()
                    this.currentUser.set(null)
                    this.router.navigate(['/login'])
                    return
                }

                this.toastService.error("Error retrieving user's data, login again")
            },
        })
    }

    private _getUserInvitations(userId: number) {
        this.api.getInvitationsReceived(userId).subscribe({
            next: (invitations) => {
                this.userInvitations.set(invitations)
            },
            error: () => {
                this.toastService.error("Error retrieving user's invitations")
            },
        })
    }

    private _getUserNotifications(userId: number) {
        this.api.getUserNotifications(userId).subscribe({
            next: (notifications) => {
                this.userNotifications.set(notifications)
            },
            error: () => {
                this.toastService.error("Error retrieving user's notifications")
            },
        })
    }

    private _getUserReviews(accountId: number) {
        this.api.getUserReviews(accountId).subscribe({
            next: (reviews) => {
                this.userReviews.set(reviews)
            },
            error: () => {
                this.toastService.error("Error retrieving user's reviews")
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

                                                  // after all, add the currentUser games list
                                                  for (const member of group.members) {
                                                      if (member.id === userId) {
                                                          this.userGames.update((games) => member.games)
                                                          break
                                                      }
                                                  }
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

    private _getUserMeets(userId: number) {
        this.api.getUserMeets(userId).subscribe({
            next: (meets) => {
                this.userMeets.set(meets)
            },
            error: () => {
                this.toastService.error("Error retrieving user's meets")
            },
        })
    }

    // #region ## public methods ##

    // --------------------------------------------------------------------------
    //   These methods are meant to follow this flow:
    //      1. Update the DB
    //      2. Update the local data (without reloading everything)
    //      3. Give feedback to the user with toasts
    // --------------------------------------------------------------------------

    public init(email: string) {
        this._getUserData(email)
    }

    public clearState() {
        this.currentUser.set(null)
        this.userGroups.set([])
        this.gamesList.set([])
        this.userInvitations.set([])
        this.invitationsGroupIndex.set({})
    }

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
                    // 3.
                    this.toastService.success('User data updated')
                },
                error: () => {
                    this.toastService.error('Error getting users email, log again')
                },
            })
    }

    // #region group-edit
    public removeMemberFromGroup(groupId: number, memberId: number) {
        // 1.
        this.api.removeMember(groupId, memberId).subscribe({
            next: (res) => {
                // 2.
                this.userGroups.update((groups) =>
                    groups.map((group) => {
                        if (group.id === groupId) {
                            group.members = group.members.filter((member) => member.id !== memberId)
                        }
                        return group
                    }),
                )
                // 3.
                this.toastService.success('Member removed from group')
            },
            error: () => {
                this.toastService.error('Error removing member')
            },
        })
        this.toastService.info('Removing group member...')
    }

    public removeInvitedFromGroup(invitationId: number) {
        // 1.
        this.api.deleteInvitation(invitationId).subscribe({
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

    // #region games

    public updateUserGames(userGameIds: Array<number>, gameIdsToToggle: Array<number>) {
        const currentUser = this.currentUser()
        if (!currentUser) return
        const gamesToAdd = gameIdsToToggle.filter((id) => !userGameIds.includes(id))
        const gamesToRemove = userGameIds.filter((id) => gameIdsToToggle.includes(id))

        // 1.
        this.api
            .updateUserGames(currentUser.id, gamesToAdd, gamesToRemove)
            .pipe(
                concatMap(() =>
                    // 2.
                    this.api
                        .getUserGames(currentUser.id)
                        .pipe(
                            catchError(() => {
                                this.toastService.error('Error fetching updated games')
                                return of([]) // Return an empty array if fetching fails
                            }),
                        ),
                ),
                catchError(() => {
                    this.toastService.error('Error updating games')
                    return of(null)
                }),
            )
            .subscribe({
                next: (games) => {
                    if (games) {
                        this.userGames.set(games)
                        this.userGroups.update((groups) =>
                            groups.map((group) => {
                                const userIndex = group.members.findIndex((member) => member.id === currentUser.id)
                                if (userIndex === -1) return group

                                group.members[userIndex].games = games
                                return group
                            }),
                        )
                        // 3.
                        this.toastService.success('Games updated')
                    }
                },
            })
    }

    // #region create group

    public createGroup(groupName: string) {
        const currentUser = this.currentUser()
        if (!currentUser) return

        // 1.
        this.api.createGroup(currentUser.id, groupName).subscribe({
            next: (res) => {
                // 2.
                this.userGroups.set([])
                this._getUserGroups(currentUser.id)

                // 3.
                this.toastService.success(`You have created the group ${groupName}`)
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('User not found')
                }
                this.toastService.error('Error creating group')
            },
        })
    }

    // #region leave group

    public leaveGroup(groupId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return

        // 1.
        this.api.leaveGroup(currentUser.id, groupId).subscribe({
            next: (res) => {
                // 2.
                this.userGroups.update((groups) => groups.filter((group) => group.id !== groupId))

                // 3.
                this.toastService.success('You have left the group')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('User or Group not found')
                }
                if (error.status === 400) {
                    return this.toastService.error('You are the group creator, you cannot leave!')
                }
                this.toastService.error('Error leaving group')
            },
        })
    }

    // #region delete group

    public deleteGroup(groupId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return

        // 1.
        this.api.deleteGroup(currentUser.id, groupId).subscribe({
            next: (res) => {
                // 2.
                this.userGroups.update((groups) => groups.filter((group) => group.id !== groupId))

                // 3.
                this.toastService.success('You have deleted the group')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Group not found')
                }
                this.toastService.error('Error deleting group')
            },
        })
    }

    // #region invitations

    public acceptInvitation(invitationId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return

        // 1.
        this.api.acceptInvitation(invitationId).subscribe({
            next: (res) => {
                // 2.
                this.userInvitations.update((invitations) => invitations.filter((invitation) => invitation.id !== invitationId))

                // refresh groups (you have a new one now)
                // TODO: smoother way to update the groups (don't reload everything)
                this.userGroups.set([])
                this._getUserGroups(currentUser.id)

                // 3.
                this.toastService.success('You have joined the group!')
            },
            error: () => {
                this.toastService.error('Error accepting invitation')
            },
        })
    }

    // #region notifications

    public deleteNotification(notificationId: number) {
        // 1.
        this.api.deleteNotification(notificationId).subscribe({
            next: (res) => {
                // 2.
                this.userNotifications.update((notifications) => notifications.filter((notification) => notification.id !== notificationId))

                // 3.
                this.toastService.success('You have deleted the notification')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Notification not found')
                }
                this.toastService.error('Error deleting notification')
            },
        })
    }

    public updateNotification(notificationId: number) {
        this.api.updateNotification(notificationId, { isRead: true }).subscribe({
            next: (res) => {
                this.userNotifications.update((notifications) =>
                    notifications.map((notification) =>
                        notification.id === notificationId ? { ...notification, isRead: true } : notification,
                    ),
                )

                this.toastService.success('Notification marked as read')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Notification not found')
                }
                this.toastService.error('Error updating notification')
            },
        })
    }

    // #region Game Reviews

    public updateGameReview(accountId: number, gameId: number, newReview: number) {
        // 1.
        this.api.deleteGameReview(accountId, gameId).subscribe({
            next: (res) => {
                // 1.
                this.api.createGameReview(accountId, gameId, newReview).subscribe({
                    next: (res) => {
                        // 2.
                        this.userReviews.set([])
                        this._getUserReviews(accountId)

                        // 3.
                        this.toastService.success('You have created the review')
                    },
                    error: (error) => {
                        if (error.status === 404) {
                            return this.toastService.error('Not found')
                        }
                        this.toastService.error('Error creating review')
                    },
                })
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Review not found')
                }
                this.toastService.error('Error deleting review')
            },
        })
    }

    public deleteGameReview(accountId: number, gameId: number) {
        // 1.
        this.api.deleteGameReview(accountId, gameId).subscribe({
            next: (res) => {
                // 2.
                this.userReviews.update((reviews) => reviews.filter((review) => review.gameId !== gameId))

                // 3.
                this.toastService.success('You have deleted the review')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Review not found')
                }
                this.toastService.error('Error deleting review')
            },
        })
    }

    public createGameReview(accountId: number, gameId: number, review: number) {
        // 1.
        this.api.createGameReview(accountId, gameId, review).subscribe({
            next: (res) => {
                // 2.
                this.userReviews.set([])
                this._getUserReviews(accountId)

                // 3.
                this.toastService.success('You have created the review')
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('Not found')
                }
                this.toastService.error('Error creating review')
            },
        })
    }

    // #region Meetings

    public createMeeting(accountId: number, groupId: number) {
        // 1.
        this.api.createMeeting(accountId, groupId).subscribe({
            next: (res) => {
                // 2.
                this.userMeets.set([])
                this._getUserMeets(groupId)

                // 3.
                this.toastService.success('New meeting created for today!')
                this.router.navigate([`/meets/${res.meetId}`])
            },
            error: () => {
                this.toastService.error('Error creating meeting')
            },
        })
    }

    public updateMeetAttendee(meetId: number, accountId: number, isAttending: boolean) {
        this.api.updateMeetAttendee(meetId, accountId, isAttending).subscribe({
            next: (res) => {
                // TODO: Only one toast for all
                // this.toastService.success(`Meet attendee ${accountId} updated to ${isAttending} in meet ${meetId}`)
                // this.toastService.success(`AccountId ${accountId}  ${isAttending}`)
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetAttendee not found')
                }
                this.toastService.error('Error updating meetAttendees')
            },
        })
    }

    public updateMeetGame(meetId: number, gameId: number, isPlayed: boolean) {
        this.api.updateMeetGame(meetId, gameId, isPlayed).subscribe({
            next: (res) => {
                // TODO: Only one toast for all
                // this.toastService.success(`Meet game ${gameId} updated to ${isPlayed} in meet ${meetId}`)
                // this.toastService.success(`GameId ${gameId}  ${isPlayed}`)
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetGame not found')
                }
                this.toastService.error('Error updating meetGames')
            },
        })
    }
}
