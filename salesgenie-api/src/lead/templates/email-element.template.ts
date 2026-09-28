/**
 * Generates structured HTML elements to embed within notification emails
 * (e.g., buttons, document attachment links, or watch video buttons).
 */

export function getButtonHtml(url: string, label: string): string {
  return `<a href="${url}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 12px; margin-top: 15px; font-family: sans-serif; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${label}</a>`;
}

export function getAttachmentHtml(url: string): string {
  return `\n\n📁 **Attachment Available:** <a href="${url}" style="display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif; font-size: 13px; margin-top: 10px; text-shadow: none;">Download Document</a>`;
}

export function getVideoHtml(url: string): string {
  return `\n\n🎥 **Video Available:** <a href="${url}" style="display: inline-block; background-color: #ef4444; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif; font-size: 13px; margin-top: 10px; text-shadow: none;">Watch Video</a>`;
}
