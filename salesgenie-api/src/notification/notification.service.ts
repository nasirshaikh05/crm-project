import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly whatsappProvider: WhatsappProvider,
  ) {}

  async sendLeadNotifications(
    lead: { firstName: string; lastName: string; email: string; phoneNumber: string; company?: string },
    preferences: { email: boolean; sms: boolean; whatsapp: boolean },
    footer?: string,
    workspaceName?: string,
  ): Promise<void> {
    const fullName = `${lead.firstName} ${lead.lastName}`;
    const subject = `Welcome to CRM, ${fullName}!`;
    const messageBody = `Hi ${fullName},\n\nThank you for connecting with us at CRM! We have received your inquiry representing ${lead.company || 'your organization'}. A representative will contact you shortly.${footer || '\n\nBest regards,\nCRM Team'}`;

    const promises: Promise<any>[] = [];

    if (preferences.email) {
      this.logger.log(`Dispatching email notification to: ${lead.email}`);
      promises.push(this.emailProvider.sendEmail(lead.email, subject, messageBody, workspaceName));
    }

    if (preferences.sms) {
      this.logger.log(`Dispatching SMS notification to: ${lead.phoneNumber}`);
      promises.push(this.smsProvider.sendSms(lead.phoneNumber, messageBody));
    }

    if (preferences.whatsapp) {
      this.logger.log(`Dispatching WhatsApp notification to: ${lead.phoneNumber}`);
      promises.push(this.whatsappProvider.sendWhatsapp(lead.phoneNumber, messageBody));
    }

    await Promise.allSettled(promises);
  }

  async sendCustomNotification(
    recipient: { email: string; phoneNumber: string },
    channels: { email?: boolean; sms?: boolean; whatsapp?: boolean },
    subject: string,
    body: string,
    workspaceName?: string,
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    if (channels.email && recipient.email) {
      this.logger.log(`Dispatching custom email to: ${recipient.email} (Subject: ${subject})`);
      promises.push(this.emailProvider.sendEmail(recipient.email, subject, body, workspaceName));
    }

    if (channels.sms && recipient.phoneNumber) {
      this.logger.log(`Dispatching custom SMS to: ${recipient.phoneNumber}`);
      promises.push(this.smsProvider.sendSms(recipient.phoneNumber, body));
    }

    if (channels.whatsapp && recipient.phoneNumber) {
      this.logger.log(`Dispatching custom WhatsApp to: ${recipient.phoneNumber}`);
      promises.push(this.whatsappProvider.sendWhatsapp(recipient.phoneNumber, body));
    }

    await Promise.allSettled(promises);
  }

  async sendEmail(to: string, subject: string, body: string, workspaceName?: string): Promise<boolean> {
    this.logger.log(`Directly sending email to: ${to} (Subject: ${subject})`);
    return this.emailProvider.sendEmail(to, subject, body, workspaceName);
  }
}
