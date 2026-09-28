import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';

@ApiBearerAuth()
@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a custom email' })
  @ApiResponse({ status: 200, description: 'Email request processed successfully.' })
  @ApiResponse({ status: 400, description: 'Email delivery failed.' })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    const success = await this.notificationService.sendEmail(
      sendEmailDto.to,
      sendEmailDto.subject,
      sendEmailDto.body,
    );
    if (!success) {
      return { success: false, message: 'Failed to send email. Check SMTP or API configurations.' };
    }
    return { success: true, message: 'Email sent successfully.' };
  }
}
