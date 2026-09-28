import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { IEmailProvider } from '../interfaces/email-provider.interface';
import { getEmailHtmlTemplate } from '../templates/email.template';

@Injectable()
export class EmailProvider implements IEmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly isConfigured: boolean = false;
  private readonly isSmtpConfigured: boolean = false;
  private readonly fromEmail: string;
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 
                      this.configService.get<string>('SENDGRID_FROM_EMAIL') || 
                      'no-reply@crm.com';

    if (smtpHost && smtpHost.trim() !== '') {
      const port = this.configService.get<number>('SMTP_PORT') || 587;
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');
      const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: (user && pass) ? { user, pass } : undefined,
      });
      this.isSmtpConfigured = true;
      this.logger.log(`SMTP Email Provider configured successfully for host: ${smtpHost}:${port}`);
    } else {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (apiKey && apiKey.trim() !== '') {
        sgMail.setApiKey(apiKey);
        this.isConfigured = true;
        this.logger.log('SendGrid Email Provider configured successfully.');
      } else {
        this.logger.warn('Neither SMTP nor SendGrid API Key found. Falling back to Console Email Provider.');
      }
    }
  }

  async sendEmail(to: string, subject: string, body: string, workspaceName?: string): Promise<boolean> {
    const htmlBody = getEmailHtmlTemplate(subject, body, workspaceName);
    if (this.isSmtpConfigured && this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: this.fromEmail,
          to,
          subject,
          text: body,
          html: htmlBody,
        });
        this.logger.log(`Email sent via SMTP to: ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email via SMTP: ${error.message}`, error.stack);
        return false;
      }
    } else if (this.isConfigured) {
      try {
        const msg = {
          to,
          from: this.fromEmail,
          subject,
          text: body,
          html: htmlBody,
        };
        await sgMail.send(msg);
        this.logger.log(`Email sent via SendGrid to: ${to}`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email via SendGrid: ${error.message}`, error.stack);
        return false;
      }
    } else {
      // Mock logger fallback
      console.log('\x1b[36m%s\x1b[0m', '\n=================== MOCK EMAIL SENT ===================');
      console.log(`FROM:    ${this.fromEmail}`);
      console.log(`TO:      ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`BODY:`);
      console.log(body);
      console.log('\x1b[36m%s\x1b[0m', '=======================================================\n');
      return true;
    }
  }
}
