export type InvitationType = {
    id: number
    groupId: number
    fromAccountId: number
    toAccountId: number
    status: string // enum: ['pending', 'accepted', 'rejected']
    sentAt: string
}
