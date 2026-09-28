import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
}

/** Backend sends `body` as both the plain-text and HTML part (see
 *  EmailProvider.sendEmail) — passing the editor's bodyHtml through
 *  as-is renders correctly since it's already HTML. */
export function sendEmail(payload: SendEmailPayload) {
  return apiRequest<SendEmailResult>({
    method: "POST",
    url: API_ENDPOINTS.notifications.sendEmail,
    data: payload,
  });
}
