import { Injectable, effect, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { catchError, concatMap, of, tap, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type {
    CollectionActivityWithGameDataType,
    GameCompleteType,
    GameProposalType,
    GameReviewWithGameData,
    GameType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetType,
    NotificationType,
    UserProposalStatsType,
    UserStatsType,
    UserType,
} from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../enums/loading-keys-enum'
import { LoadingService } from './loading.service'
import { LocalStorageService } from './local-storage.service'
import { LogService } from './log.service'
import { LoginService } from './login.service'

@Injectable({ providedIn: 'root' })
export class DataService {
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        signals definition
    // --------------------------------------------------------------------------
    // current user data, null if not logged in
    public readonly currentUser = signal<null | UserType>(null)

    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    // `userXYZ` to store the data of the current user
    public readonly userGames = signal<Array<GameCompleteType>>([])
    public readonly userGroups = signal<Array<GroupWithMembersAndGames>>([])
    public readonly userNotifications = signal<Array<NotificationType>>([])
    public readonly userInvitations = signal<Array<InvitationWithExtraData>>([])
    public readonly userReviews = signal<Array<GameReviewWithGameData>>([])
    public readonly userMeets = signal<Array<MeetType>>([])
    public readonly userHistory = signal<Array<HistoryRecordType>>([])
    public readonly userWishlist = signal<Array<GameCompleteType>>([])
    public readonly userCollectionActivity = signal<Array<CollectionActivityWithGameDataType>>([])
    public readonly userProposals = signal<Array<GameProposalType>>([])
    public readonly userProposalStats = signal<UserProposalStatsType>({
        totalProposals: 0,
        approvedProposals: 0,
        rejectedProposals: 0,
        duplicateProposals: 0,
        pendingProposals: 0,
        approvalRate: 0,
        reputationScore: 0,
    })
    // non arrays
    public readonly userStats = signal<UserStatsType>({
        totalGamesValue: 0,
    })
    public readonly groupHistoryByGroupId = signal<Record<number, Array<HistoryRecordType>>>({})

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {Invitation[]} has pending)
    public readonly invitationsGroupIndex = signal<Record<number, Array<InvitationWithAccountsData>>>({})

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    constructor() {
        this.logger.log('DataService initialized.')

        // Effect to react to currentUser changes (login/logout)
        effect(() => {
            const user = this.currentUser()
            if (user?.id) {
                this.logger.log(`DataService: currentUser updated (ID: ${user.id}). Fetching derived data.`)
                this._fetchAllDerivedUserData(user.id)
            } else {
                this.logger.log('DataService: currentUser is null (logout or initial state). Clearing derived data.')
                this._clearAllDerivedUserData()
            }
        })
    }
    private _fetchAllDerivedUserData(userId: number): void {
        this._getUserGames(userId)
        this._getUserGroups(userId)
        this._getUserNotifications(userId)
        this._getUserInvitations(userId)
        this._getUserReviews(userId)
        this._getUserMeets(userId)
        this._getUserHistory(userId)
        this._getUserWishlist(userId)
        this._getUserCollectionActivity(userId)
        this._getUserProposals(userId)
        this._getUserProposalStats(userId)
        this._getUserStats(userId)
        // Add any other derived data fetches here
    }

    private _clearAllDerivedUserData(): void {
        this.userGames.set([])
        this.userGroups.set([])
        this.userNotifications.set([])
        this.userInvitations.set([])
        this.userReviews.set([])
        this.userMeets.set([])
        this.userHistory.set([])
        this.userWishlist.set([])
        this.userCollectionActivity.set([])
        this.userProposals.set([])
        this.userProposalStats.set({
            totalProposals: 0,
            approvedProposals: 0,
            rejectedProposals: 0,
            duplicateProposals: 0,
            pendingProposals: 0,
            approvalRate: 0,
            reputationScore: 0,
        })
        this.userStats.set({ totalGamesValue: 0 }) // Reset to default
        this.groupHistoryByGroupId.set({})
        this.invitationsGroupIndex.set({})

        // Note: LoadingService.setAllLoadingTo(true) in LoginService's logout
        // should handle resetting the loading states for these items if they
        // are part of the initial set of loading keys.
        // If not, you might need to manually reset them here or ensure
        // each _getUserXYZ method sets its loading key to true even if data is empty.
    }

    private _getUserGames(userId: number) {
        this.api.getUserGames(userId).subscribe({
            next: games => {
                this.userGames.set(games)
                this.userGroups.update(groups =>
                    groups.map(group => ({
                        ...group,
                        members: group.members.map(member => (member.id === userId ? { ...member, games } : member)),
                    })),
                )
            },
            error: () => {
                this.toastService.error('Error retrieving user games')
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_GAMES)
            },
        })
    }

    private _getUserInvitations(userId: number) {
        this.api.getUserInvitations(userId).subscribe({
            next: invitations => {
                this.userInvitations.set(invitations)
            },
            error: () => {
                this.toastService.error("Error retrieving user's invitations")
            },
        })
    }

    private _getUserNotifications(userId: number) {
        this.api.getUserNotifications(userId).subscribe({
            next: notifications => {
                this.userNotifications.set(notifications)
            },
            error: () => {
                this.toastService.error("Error retrieving user's notifications")
            },
        })
    }

    private _getUserReviews(accountId: number) {
        this.api.getUserReviews(accountId).subscribe({
            next: reviews => {
                this.userReviews.set(reviews)
            },
            error: () => {
                this.toastService.error("Error retrieving user's reviews")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_REVIEWS)
            },
        })
    }

    private _getUserGroups(accountId: number) {
        this.api.getUserGroups(accountId).subscribe({
            next: groups => {
                this.userGroups.set(groups)

                for (const group of groups) {
                    this.api.getGroupInvitations(group.id).subscribe({
                        next: invitations => {
                            this.invitationsGroupIndex.update(index => ({
                                ...index,
                                [group.id]: invitations,
                            }))
                        },
                        error: () => {
                            this.toastService.error(`Error retrieving invited members for group: ${group.name}`)
                        },
                    })
                }
            },
            error: () => {
                this.toastService.error("Error retrieving user's groups")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_GROUPS)
            },
        })
    }

    private _getUserMeets(userId: number) {
        this.api.getUserMeets(userId).subscribe({
            next: meets => {
                this.userMeets.set(meets)
            },
            error: () => {
                this.toastService.error("Error retrieving user's meets")
            },
        })
    }

    private _getUserHistory(userId: number) {
        this.api.getUserGamesHistory(userId).subscribe({
            next: history => {
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

    private _getUserWishlist(userId: number) {
        this.api.getUserWishlist(userId).subscribe({
            next: wishlist => {
                this.userWishlist.set(wishlist)
            },
            error: () => {
                this.toastService.error("Error retrieving user's wishlist")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_WISHLIST)
            },
        })
    }

    private _getUserCollectionActivity(userId: number) {
        this.api.getUserCollectionActivity(userId).subscribe({
            next: collectionActivity => {
                this.userCollectionActivity.set(collectionActivity)
            },
            error: () => {
                this.toastService.error("Error retrieving user's collection activity")
            },
            complete: () => {
                this.loadingService.finish(LOADING_KEYS.USER_COLLECTION_ACTIVITY)
            },
        })
    }

    private _getUserStats(userId: number) {
        this.api.getUserStats(userId).subscribe({
            next: stats => {
                this.userStats.set(stats)
            },
            error: () => {
                this.toastService.error("Error retrieving user's stats")
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

    // #region form-update-profile

    public updateCurrentUserData(requestBody: { username?: string; displayName?: string; avatar?: UserType['avatar'] }) {
        const currentUser = this.currentUser()
        if (!currentUser) {
            return
        }

        // 1.
        this.api
            .updateUser(currentUser.id, requestBody)
            .pipe(concatMap(res => this.api.getUserById(currentUser.id)))
            .subscribe({
                next: updatedUser => {
                    // 2.
                    this.currentUser.set(updatedUser)
                    this.userGroups.update(groups =>
                        groups.map(group => {
                            const userIndex = group.members.findIndex(member => member.id === currentUser.id)
                            if (userIndex === -1) return group

                            // update the user data inside that group
                            if (requestBody.username) {
                                group.members[userIndex].username = requestBody.username
                            }
                            if (requestBody.displayName) {
                                group.members[userIndex].displayName = requestBody.displayName
                            }
                            if (requestBody.avatar) {
                                group.members[userIndex].avatar = requestBody.avatar
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
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.removeMember(currentUser.id, groupId, memberId).pipe(
            tap(() => {
                this.userGroups.update(groups =>
                    groups.map(group => {
                        if (group.id === groupId) {
                            group.members = group.members.filter(member => member.id !== memberId)
                        }
                        return group
                    }),
                )
                this.toastService.success('Member removed from group')
            }),
            catchError(error => {
                this.toastService.error('Error removing member')
                return throwError(() => error)
            }),
        )
    }

    public removeInvitedFromGroup(invitationId: number) {
        return this.api.deleteInvitation(invitationId).pipe(
            tap(() => {
                this.invitationsGroupIndex.update(index => {
                    const groupIds = Object.keys(index).map(Number)
                    for (const groupId of groupIds) {
                        index[groupId] = (index[groupId] ?? []).filter(invitation => invitation.id !== invitationId)
                    }
                    return index
                })
                this.toastService.success('Invitation removed')
            }),
            catchError(error => {
                this.toastService.error('Error removing invitation')
                return throwError(() => error)
            }),
        )
    }

    public addInvitedToGroup(groupId: number, invitedUsername: string) {
        return this.api.createInvitation(groupId, invitedUsername).pipe(
            concatMap(() => this.api.getGroupInvitations(groupId)),
            tap(invitations => {
                this.invitationsGroupIndex.update(index => ({
                    ...index,
                    [groupId]: invitations,
                }))
                this.toastService.success('Invitation sent')
            }),
            catchError(error => {
                if (error.status === 404) {
                    this.toastService.error('User not found')
                } else {
                    this.toastService.error('Error sending invitation')
                }
                return throwError(() => error)
            }),
        )
    }

    // #region games

    public updateUserGames(userGameIds: Array<number>, gameIdsToToggle: Array<number>) {
        const currentUser = this.currentUser()
        if (!currentUser) return
        const gamesToAdd = gameIdsToToggle.filter(id => !userGameIds.includes(id))
        const gamesToRemove = userGameIds.filter(id => !gameIdsToToggle.includes(id))

        // 1.
        this.api
            .updateUserGames(currentUser.id, gamesToAdd, gamesToRemove)
            .pipe(
                concatMap(() =>
                    // 2.
                    this.api.getUserGames(currentUser.id).pipe(
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
                next: games => {
                    if (games) {
                        this.userGames.set(games)
                        this.userGroups.update(groups =>
                            groups.map(group => {
                                const userIndex = group.members.findIndex(member => member.id === currentUser.id)
                                if (userIndex === -1) return group

                                return {
                                    ...group,
                                    members: group.members.map(member => (member.id === currentUser.id ? { ...member, games } : member)),
                                }
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
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.createGroup(currentUser.id, groupName).pipe(
            concatMap(() => {
                this.userGroups.set([])
                this._getUserGroups(currentUser.id)
                this.toastService.success(`You have created the group ${groupName}`)
                return of(true)
            }),
            catchError(error => {
                if (error.status === 404) {
                    this.toastService.error('User not found')
                } else {
                    this.toastService.error('Error creating group')
                }
                return throwError(() => error)
            }),
        )
    }

    // #region leave group

    public leaveGroup(groupId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return

        // 1.
        this.api.leaveGroup(currentUser.id, groupId).subscribe({
            next: res => {
                // 2.
                this.userGroups.update(groups => groups.filter(group => group.id !== groupId))

                // 3.
                this.toastService.success('You have left the group')
            },
            error: error => {
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
            next: res => {
                // 2.
                this.userGroups.update(groups => groups.filter(group => group.id !== groupId))

                // 3.
                this.toastService.success('You have deleted the group')
            },
            error: error => {
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
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.acceptInvitation(currentUser.id, invitationId).pipe(
            tap(() => {
                this.userInvitations.update(invitations => invitations.filter(invitation => invitation.id !== invitationId))
                this.userGroups.set([])
                this._getUserGroups(currentUser.id)
                this.toastService.success('You have joined the group!')
            }),
            catchError(error => {
                this.toastService.error('Error accepting invitation')
                return throwError(() => error)
            }),
        )
    }

    public rejectInvitation(invitationId: number) {
        return this.api.rejectInvitation(invitationId).pipe(
            tap(() => {
                this.userInvitations.update(invitations => invitations.filter(invitation => invitation.id !== invitationId))
                this.toastService.success('Invitation declined')
            }),
            catchError(error => {
                this.toastService.error('Error declining invitation')
                return throwError(() => error)
            }),
        )
    }

    // #region notifications

    public deleteNotification(notificationId: number) {
        // 1.
        this.api.deleteNotification(notificationId).subscribe({
            next: res => {
                // 2.
                this.userNotifications.update(notifications => notifications.filter(notification => notification.id !== notificationId))

                // 3.
                this.toastService.success('You have deleted the notification')
            },
            error: error => {
                if (error.status === 404) {
                    return this.toastService.error('Notification not found')
                }
                this.toastService.error('Error deleting notification')
            },
        })
    }

    public updateNotification(notificationId: number) {
        this.api.updateNotification(notificationId, { isRead: true }).subscribe({
            next: res => {
                this.userNotifications.update(notifications =>
                    notifications.map(notification =>
                        notification.id === notificationId ? { ...notification, isRead: true } : notification,
                    ),
                )

                this.toastService.success('Notification marked as read')
            },
            error: error => {
                if (error.status === 404) {
                    return this.toastService.error('Notification not found')
                }
                this.toastService.error('Error updating notification')
            },
        })
    }

    // #region Game Reviews

    public saveGameReview(accountId: number, gameId: number, review: number) {
        // 1.
        this.api.saveGameReview(accountId, gameId, review).subscribe({
            next: res => {
                // TODO: res should return GameReviewType so we just append it to the array later
                // 2.
                this.userReviews.set([])
                this._getUserReviews(accountId)

                // 3.
                this.toastService.success('Review saved')
            },
            error: error => {
                this.toastService.error('Error saving review')
            },
        })
    }

    public refreshGameReviews() {
        const currentUser = this.currentUser()
        if (!currentUser) return

        this.userReviews.set([])
        this._getUserReviews(currentUser.id)
    }

    public refreshUserWishlist() {
        const currentUser = this.currentUser()
        if (!currentUser) return

        this.userWishlist.set([])
        this._getUserWishlist(currentUser.id)
    }

    public refreshUserGames() {
        const currentUser = this.currentUser()
        if (!currentUser) return

        this.userGames.set([])
        this._getUserGames(currentUser.id)
    }

    // #region Meetings

    public createMeeting(accountId: number, groupId: number) {
        // 1.
        this.api.createMeeting(accountId, groupId).subscribe({
            next: res => {
                // 2.
                this.userMeets.set([])
                this._getUserMeets(groupId)

                // 3.
                this.toastService.success('New meeting created for today!')
                this.router.navigate([`/groups/${groupId}`])
            },
            error: () => {
                this.toastService.error('Error creating meeting')
            },
        })
    }

    public refreshUserMeets() {
        const currentUser = this.currentUser()
        if (!currentUser) return

        this.userMeets.set([])
        this._getUserMeets(currentUser.id)
    }

    public createMeetAttendee(meetId: number, accountId: number) {
        return this.api.createMeetAttendee(meetId, accountId).pipe(
            catchError(error => {
                this.toastService.error(error.status === 404 ? 'Meet attendee not found' : 'Could not save the attendee change')
                return throwError(() => error)
            }),
        )
    }

    public deleteMeetAttendee(meetId: number, accountId: number) {
        return this.api.deleteMeetAttendee(meetId, accountId).pipe(
            catchError(error => {
                this.toastService.error(error.status === 404 ? 'Meet attendee not found' : 'Could not save the attendee change')
                return throwError(() => error)
            }),
        )
    }

    public createMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this.api.createMeetAccountGame(accountId, meetId, gameId).pipe(
            catchError(error => {
                this.toastService.error(error.status === 404 ? 'Meet game not found' : 'Could not save the played-game change')
                return throwError(() => error)
            }),
        )
    }

    public deleteMeetAccountGame(accountId: number, meetId: number, gameId: number) {
        return this.api.deleteMeetAccountGame(accountId, meetId, gameId).pipe(
            catchError(error => {
                this.toastService.error(error.status === 404 ? 'Meet game not found' : 'Could not save the played-game change')
                return throwError(() => error)
            }),
        )
    }

    private _getUserProposals(userId: number) {
        this.api.getUserProposals(userId).subscribe({
            next: proposals => {
                this.userProposals.set(proposals)
            },
            error: () => {
                this.toastService.error("Error retrieving user's proposals")
            },
        })
    }

    private _getUserProposalStats(userId: number) {
        this.api.getUserProposalStats(userId).subscribe({
            next: stats => {
                this.userProposalStats.set(stats)
            },
            error: () => {
                this.toastService.error("Error retrieving user's proposal stats")
            },
        })
    }
}
