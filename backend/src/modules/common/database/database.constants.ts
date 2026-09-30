// Account columns the application reads. Always select them by name: the
// table's column order changed when migration 0015 dropped the legacy
// credential columns.
export const ACCOUNT_COLUMNS = 'id, email, username, avatar, displayName, created_at, isDeleted, isAdmin, clerkUserId'
