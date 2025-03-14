import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'

import { NotificationDataMap, NotificationTypeEnum } from '../../modules/core/notifications/notifications-enum.type'

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

    @ApiProperty({ example: 'message' })
    message: string

    @ApiProperty({ example: '{}' })
    data: NotificationDataMap[NotificationTypeEnum]

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
export class UpdateNotificationBody extends PartialType(PickType(NotificationDto, ['accountId', 'type', 'message', 'isRead'])) {}
