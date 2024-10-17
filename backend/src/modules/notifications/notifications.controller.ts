import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CreateNotificationBody, NotificationDto, UpdateNotificationBody } from '../../common/types/notification.type'

@UseGuards(JwtAuthGuard)
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all notifications', deprecated: true })
    @ApiResponse({ status: 200, type: [NotificationDto], description: 'List of all notifications' })
    async getNotifications() {
        return this.notificationsService.getNotifications()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new notification', deprecated: true })
    @ApiResponse({ status: 201, description: 'The notification has been succesfully created' })
    async createNotification(@Body() notificationDto: CreateNotificationBody) {
        return this.notificationsService.createNotification(notificationDto)
    }

    @Get('/:notificationId')
    @ApiOperation({ summary: 'Get notification by id', deprecated: true })
    @ApiResponse({ status: 200, type: NotificationDto, description: 'Notification found' })
    @ApiResponse({ status: 404, description: 'Notification not found' })
    @ApiParam({ name: 'notificationId', type: String })
    getNotificationById(@Param('notificationId', ParseIntPipe) notificationId: number) {
        return this.notificationsService.getNotificationById(notificationId)
    }

    @Put(':notificationId')
    @ApiOperation({ summary: 'Update a notification by ID' })
    @ApiParam({ name: 'notificationId', required: true, description: 'Notification ID' })
    @ApiBody({ type: UpdateNotificationBody, description: 'Partial or full notification object to update' })
    @ApiResponse({ status: 200, description: 'The notification has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Notification not found.' })
    updateNotification(
        @Param('notificationId', ParseIntPipe) notificationId: number,
        @Body() partialNotificationDto: UpdateNotificationBody,
    ) {
        return this.notificationsService.updateNotification(notificationId, partialNotificationDto)
    }

    @Delete('/:notificationId')
    @ApiOperation({ summary: 'Delete a notification by Id' })
    @ApiResponse({ status: 200, description: 'The notification has been succesfully deleted' })
    @ApiParam({ name: 'notificationId', type: String, description: 'ID of the notification to be deleted' })
    async deleteNotificationById(@Param('notificationId', ParseIntPipe) notificationId: number) {
        return this.notificationsService.deleteNotificationById(notificationId)
    }
}
