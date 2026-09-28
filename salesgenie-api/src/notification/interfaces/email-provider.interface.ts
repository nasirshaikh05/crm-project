export interface IEmailProvider {
  sendEmail(to: string, subject: string, body: string, workspaceName?: string): Promise<boolean>;
}
