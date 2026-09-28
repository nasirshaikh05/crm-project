export interface IWhatsappProvider {
  sendWhatsapp(to: string, message: string): Promise<boolean>;
}
