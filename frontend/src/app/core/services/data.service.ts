import { Injectable, effect, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type {
    GamePlayHistoryType,
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
import { LOADING_KEYS } from '../enums/loading-keys-enum'
import { LoadingService } from './loading.service'
import { LocalStorageService } from './local-storage.service'
import { LoginService } from './login.service'

@Injectable({ providedIn: 'root' })
export class DataService {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly toastService = inject(ToastService)
    private readonly loginService = inject(LoginService)
    private readonly loadingService = inject(LoadingService)
    private readonly localStorageService = inject(LocalStorageService)

    // --------------------------------------------------------------------------
    //        signals definition
    // --------------------------------------------------------------------------
    // current user data, null if not logged in
    public readonly currentUser = signal<null | UserType>(null)

    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    // `userXYZ` to store the data of the current user
    public readonly userGames = signal<Array<GameType>>([])
    public readonly userGroups = signal<Array<GroupWithMembersAndGames>>([])
    public readonly userNotifications = signal<Array<NotificationType>>([])
    public readonly userInvitations = signal<Array<InvitationWithExtraData>>([])
    public readonly userReviews = signal<Array<GameReviewType>>([])
    public readonly userMeets = signal<Array<MeetType>>([])
    public readonly userHistory = signal<Array<GamePlayHistoryType>>([])

    // list of all games available to select
    public readonly gamesList = signal<Array<GameType>>([])

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {Invitation[]} has pending)
    public readonly invitationsGroupIndex = signal<Record<number, Array<InvitationWithAccountsData>>>({})

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    constructor() {
        effect(() => {
            const token = this.loginService.getToken()
            const email = this.loginService.email
            if (token && email) {
                // 1. Get the user data
                this._getUserData(email)
                // 2. Get the games list (commmon for all users)
                this._getGamesList()
            }
        })
    }

    private _getUserData(email: string) {
        this.api.getUserByEmail(email).subscribe({
            next: (userType) => {
                this.currentUser.set(userType)

                // GET derived data
                this._getUserGroups(userType.id)
                this._getUserNotifications(userType.id)
                this._getUserInvitations(userType.id)
                this._getUserReviews(userType.id)
                this._getUserMeets(userType.id)
                this._getUserHistory(userType.id)
            },
            error: (error) => {
                if (error.status === 401) {
                    this.toastService.error('Your session has expired, please log in again')
                    this.localStorageService.clear()
                    this.currentUser.set(null)
                    this.router.navigate(['/'])
                    return
                }

                this.toastService.error("Error retrieving user's data, login again")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_DATA)
            },
        })
    }

    private _getGamesList() {
        this.api.getGames().subscribe({
            next: (games) => {
                this.gamesList.set(games)
            },
            error: () => {
                this.toastService.error('Error retrieving games list')
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
                // If no groupIds, loading=false because there is nothing to fetch
                tap((groupIds) => {
                    if (groupIds.length === 0) {
                        // early finish because no groupIds to fetch
                        this.loadingService.finish(LOADING_KEYS.USER_GROUPS)
                    }
                }),
                catchError((err) => {
                    // early finish because no groupIds to fetch
                    this.toastService.error("Error retrieving user's groups")
                    this.loadingService.finish(LOADING_KEYS.USER_GROUPS)
                    return of([])
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
            .subscribe({
                complete: () => {
                    this.loadingService.finish(LOADING_KEYS.USER_GROUPS)
                },
            })
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

    private _getUserHistory(userId: number) {
        this.api.getUserGamesHistory(userId).subscribe({
            next: (history) => {
                this.userHistory.set(history)
            },
            error: () => {
                this.toastService.error("Error retrieving user's history")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_GAMES_HISTORY)
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
        displayName?: string
        avatar?: UserType['avatar']
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

                            for (const [key, value] of Object.entries(requestBody) as Array<
                                [keyof typeof requestBody, UserType['avatar']]
                            >) {
                                if (requestBody[key] === updatedUser[key]) {
                                    // extra check
                                    // group.members[userIndex][key] = value
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
                        this.userReviews.update((reviews) =>
                            reviews.map((review) => (review.gameId === gameId ? { ...review, review: newReview } : review)),
                        )

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
                // TODO: res should return GameReviewType so we just append it to the array later
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
                this.router.navigate([`/group/${groupId}`])
            },
            error: () => {
                this.toastService.error('Error creating meeting')
            },
        })
    }

    public createMeetAttendee(meetId: number, accountId: number) {
        this.api.createMeetAttendee(meetId, accountId).subscribe({
            next: (res) => {},
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetAttendee not found')
                }
                this.toastService.error('Error updating meetAttendees')
            },
        })
    }

    public deleteMeetAttendee(meetId: number, accountId: number) {
        this.api.deleteMeetAttendee(meetId, accountId).subscribe({
            next: (res) => {},
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetAttendee not found')
                }
                this.toastService.error('Error updating meetAttendees')
            },
        })
    }

    public createMeetGame(meetId: number, gameId: number) {
        this.api.createMeetGame(meetId, gameId).subscribe({
            next: (res) => {},
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetGame not found')
                }
                this.toastService.error('Error updating meetGames')
            },
        })
    }

    public deleteMeetGame(meetId: number, gameId: number) {
        this.api.deleteMeetGame(meetId, gameId).subscribe({
            next: (res) => {},
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error('MeetGame not found')
                }
                this.toastService.error('Error updating meetGames')
            },
        })
    }
}
