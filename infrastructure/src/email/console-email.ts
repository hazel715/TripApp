import type { EmailSender, EmailMessage } from "@tripapp/application";
export class ConsoleEmailSender implements EmailSender {
  async sendLoginLink(message:EmailMessage){console.info(`[development email] ${message.to}\n${message.text}`)}
}
