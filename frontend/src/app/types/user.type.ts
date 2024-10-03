export type UserType = {
    id: number
    email: string
    username: string
    display_name: string
    imageUrl: string
    createdAt: string
    is_deleted: boolean
}

export type GroupMemberType = {
    accountId: number
    username: string
    display_name: string
    email: string
    imageUrl: string
}
