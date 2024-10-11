import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

/**
 * base Notification as it comes from db
 */
export class NotificationDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    accountId: number

    @ApiProperty({ example: 'expelled' })
    type: string

    @ApiProperty({ example: 12345 })
    relatedUserGroupId: null | number

    @ApiProperty({ example: 12345 })
    relatedGameId: null | number

    @ApiProperty({ example: 'message' })
    message: string

    @ApiProperty({ example: '2022-03-07T16:00:00.000Z' })
    createdAt: string

    @ApiProperty({ example: true })
    isRead: boolean
}

/**
 * POST requests --> no db generated props
 */
export class CreateNotificationBody extends OmitType(NotificationDto, ['id', 'createdAt', 'isRead']) {}

/**
 * PUT requests --> editable fields
 */
export class UpdateNotificationBody extends PartialType(
    PickType(NotificationDto, ['accountId', 'type', 'relatedUserGroupId', 'relatedGameId', 'message', 'isRead']),
) {}

export const NotificationTypeEnum = {
    InvitationAccepted: 'invitation_accepted',
}
