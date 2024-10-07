import { UserType } from './user.type'

export type InvitationType = {
    id: number
    groupId: number
    fromAccountId: number
    toAccountId: number
    status: string // enum: ['pending', 'accepted', 'rejected']
    sentAt: string
}

export type InvitationWithAccountsData = InvitationType & {
    fromAccount: UserType
    toAccount: UserType
}
