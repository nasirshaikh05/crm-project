import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider } from '../interfaces/sms-provider.interface';
import { Twilio } from 'twilio';

@Injectable()
export class SmsProvider implements ISmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly client: Twilio | null = null;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') || '+917901492398';

    if (accountSid && authToken && accountSid.trim() !== '' && authToken.trim() !== '') {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS Provider configured successfully.');
    } else {
      this.logger.warn('Twilio credentials not found. Falling back to Console SMS Provider.');
    }
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to,
        });
        this.logger.log(`SMS sent successfully to ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send SMS via Twilio to ${to}: ${error.message}`, error.stack);
        return false;
      }
    } else {
      // Mock logger fallback
      console.log('\x1b[33m%s\x1b[0m', '\n==================== MOCK SMS SENT ====================');
      console.log(`FROM:    ${this.fromNumber}`);
      console.log(`TO:      ${to}`);
      console.log(`MESSAGE: ${message}`);
      console.log('\x1b[33m%s\x1b[0m', '=======================================================\n');
      return true;
    }
  }
}
