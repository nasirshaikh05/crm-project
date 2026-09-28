import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IWhatsappProvider } from '../interfaces/whatsapp-provider.interface';
import { Twilio } from 'twilio';

@Injectable()
export class WhatsappProvider implements IWhatsappProvider {
  private readonly logger = new Logger(WhatsappProvider.name);
  private readonly client: Twilio | null = null;
  private readonly fromWhatsAppNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromWhatsAppNumber = this.configService.get<string>('TWILIO_WHATSAPP_FROM_NUMBER') || '+917901492398';

    if (accountSid && authToken && accountSid.trim() !== '' && authToken.trim() !== '') {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio WhatsApp Provider configured successfully.');
    } else {
      this.logger.warn('Twilio credentials not found. Falling back to Console WhatsApp Provider.');
    }
  }

  async sendWhatsapp(to: string, message: string): Promise<boolean> {
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (this.client) {
      try {
        await this.client.messages.create({
          body: message,
          from: this.fromWhatsAppNumber,
          to: whatsappTo,
        });
        this.logger.log(`WhatsApp message sent successfully to ${whatsappTo}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send WhatsApp message via Twilio to ${whatsappTo}: ${error.message}`, error.stack);
        return false;
      }
    } else {
      // Mock logger fallback
      console.log('\x1b[32m%s\x1b[0m', '\n================= MOCK WHATSAPP SENT =================');
      console.log(`FROM:    ${this.fromWhatsAppNumber}`);
      console.log(`TO:      ${whatsappTo}`);
      console.log(`MESSAGE: ${message}`);
      console.log('\x1b[32m%s\x1b[0m', '=======================================================\n');
      return true;
    }
  }
}
