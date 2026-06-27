import type { ChannelConnector, InboundMessage, OutboundMessage } from './index';

/**
 * Telegram via Bot API.
 * Credentials (encrypted at rest): { botToken }
 * Vendor sets the webhook to /api/webhooks/telegram/<tenantId>?s=<secret> once.
 */
export const telegram: ChannelConnector = {
  type: 'telegram',

  parseInbound(body: any): InboundMessage[] {
    const msg = body?.message ?? body?.edited_message;
    if (!msg?.chat?.id) return [];
    return [{ customerRef: String(msg.chat.id), text: String(msg.text ?? ''), raw: msg }];
  },

  async send(creds: Record<string, any>, msg: OutboundMessage): Promise<void> {
    const { botToken } = creds;
    if (!botToken) return;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: msg.customerRef, text: msg.text }),
    });
  },
};
