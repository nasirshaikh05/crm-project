import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { NotificationController } from './notification.controller';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController],
  providers: [
    EmailProvider,
    SmsProvider,
    WhatsappProvider,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
