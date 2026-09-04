import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { CreateNotificationRequestBody, NotificationDto, UpdateNotificationRequestBody } from '../../../common/types/notification.type'

import { NotificationsService } from './notifications.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all notifications', deprecated: true })
    @ApiResponse({ status: 200, type: [NotificationDto], description: 'List of all notifications' })
    async getNotifications(@Req() request: { user: { userId: number } }) {
        return this.notificationsService.getNotificationsByAccountId(request.user.userId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new notification', deprecated: true })
    @ApiResponse({ status: 201, description: 'The notification has been succesfully created' })
    async createNotification(@Req() request: { user: { userId: number } }, @Body() notificationDto: CreateNotificationRequestBody) {
        return this.notificationsService.createNotification({ ...notificationDto, accountId: request.user.userId })
    }

    @Get('/:notificationId')
    @ApiOperation({ summary: 'Get notification by id', deprecated: true })
    @ApiResponse({ status: 200, type: NotificationDto, description: 'Notification found' })
    @ApiResponse({ status: 404, description: 'Notification not found' })
    getNotificationById(@Req() request: { user: { userId: number } }, @Param('notificationId', ParseIntPipe) notificationId: number) {
        return this.notificationsService.getNotificationById(notificationId, request.user.userId)
    }

    @Put(':notificationId')
    @ApiOperation({ summary: 'Update a notification by ID' })
    @ApiResponse({ status: 200, description: 'The notification has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Notification not found.' })
    updateNotification(
        @Req() request: { user: { userId: number } },
        @Param('notificationId', ParseIntPipe) notificationId: number,
        @Body() partialNotificationDto: UpdateNotificationRequestBody,
    ) {
        return this.notificationsService.updateNotification(notificationId, request.user.userId, partialNotificationDto)
    }

    @Delete('/:notificationId')
    @ApiOperation({ summary: 'Delete a notification by Id' })
    @ApiResponse({ status: 200, description: 'The notification has been succesfully deleted' })
    async deleteNotificationById(
        @Req() request: { user: { userId: number } },
        @Param('notificationId', ParseIntPipe) notificationId: number,
    ) {
        return this.notificationsService.deleteNotificationById(notificationId, request.user.userId)
    }
}
