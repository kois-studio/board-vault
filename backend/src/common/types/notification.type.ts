import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNotEmpty, IsObject, IsString, MaxLength, Min } from 'class-validator'

import { NotificationDataMap, NotificationTypeEnum } from '../../modules/core/notifications/notifications-enum.type.js'

export class NotificationAccountDto {
    @ApiProperty({ example: 7 })
    id: number

    @ApiProperty({ example: 'Ana', nullable: true, description: 'Null for a deleted account; the app writes "Deleted account".' })
    name: string | null

    @ApiProperty({ example: false })
    deleted: boolean
}

export class NotificationNamedDto {
    @ApiProperty({ example: 3 })
    id: number

    @ApiProperty({ example: 'Thursday Crew' })
    name: string
}

export class NotificationSessionDto {
    @ApiProperty({ example: 41 })
    id: number

    @ApiProperty({ example: '2026-10-09T17:00:00.000Z' })
    date: string

    @ApiProperty({ example: 'Europe/Madrid' })
    timezone: string
}

export class NotificationGameDto {
    @ApiProperty({ example: 12 })
    id: number

    @ApiProperty({ example: 'Ciudadelas' })
    title: string

    @ApiProperty({ example: 'es', description: 'The language of the title.' })
    titleLanguage: string
}

/**
 * What the notification's `data` points at, looked up when the inbox is read (ADR-0024), so the app
 * can word it in the reader's language. Something that no longer exists is left out; the app then
 * shows the stored `message`.
 */
export class NotificationContextDto {
    @ApiProperty({ type: [NotificationAccountDto] })
    accounts: Array<NotificationAccountDto>

    @ApiProperty({ type: [NotificationNamedDto] })
    groups: Array<NotificationNamedDto>

    @ApiProperty({ type: [NotificationSessionDto] })
    sessions: Array<NotificationSessionDto>

    @ApiProperty({ type: [NotificationNamedDto], description: 'Group people.' })
    people: Array<NotificationNamedDto>

    @ApiProperty({ type: [NotificationGameDto] })
    games: Array<NotificationGameDto>
}

/**
 * base Notification as it comes from db
 */
export class NotificationDto {
    @ApiProperty({ example: 12345 })
    id: number

    @ApiProperty({ example: 12345 })
    @IsInt()
    @Min(1)
    accountId: number

    @ApiProperty({ example: 'expelled' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    type: string

    @ApiProperty({ example: 'message' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    message: string

    @ApiProperty({ example: '{}' })
    @IsObject()
    data: NotificationDataMap[NotificationTypeEnum]

    @ApiProperty({ example: '2022-03-07T16:00:00.000Z' })
    createdAt: string

    @ApiProperty({ example: true })
    @IsBoolean()
    isRead: boolean

    @ApiProperty({ type: NotificationContextDto, required: false, description: 'Only on inbox reads.' })
    context?: NotificationContextDto
}

/**
 * POST requests --> no db generated props
 */
export class CreateNotificationBody extends OmitType(NotificationDto, ['id', 'createdAt', 'isRead', 'context']) {}

/**
 * PUT requests --> editable fields
 */
export class UpdateNotificationBody extends PartialType(PickType(NotificationDto, ['accountId', 'type', 'message', 'isRead'])) {}

/**
 * PUT requests from authenticated users; only the read state is user-editable.
 */
export class UpdateNotificationRequestBody extends PartialType(PickType(NotificationDto, ['isRead'])) {}
