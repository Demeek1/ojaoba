import type { ChannelConnector, InboundMessage, OutboundMessage } from './index';

/**
 * WhatsApp via Meta Cloud API.
 * Credentials (encrypted at rest): { accessToken, phoneNumberId, verifyToken }
 */
export const whatsapp: ChannelConnector = {
  type: 'whatsapp',

  verify(params, creds) {
    // Meta webhook verification handshake
    const mode = params.get('hub.mode');
    const token = params.get('hub.verify_token');
    const challenge = params.get('hub.challenge');
    if (mode === 'subscribe' && token && creds.verifyToken && token === creds.verifyToken) {
      return challenge ?? '';
    }
    return null;
  },

  parseInbound(body: any): InboundMessage[] {
    const out: InboundMessage[] = [];
    try {
      for (const entry of body?.entry ?? []) {
        for (const change of entry?.changes ?? []) {
          for (const m of change?.value?.messages ?? []) {
            const text = m?.text?.body ?? m?.button?.text ?? m?.interactive?.list_reply?.title ?? '';
            if (m?.from) out.push({ customerRef: String(m.from), text: String(text), raw: m });
          }
        }
      }
    } catch {
      /* ignore malformed */
    }
    return out;
  },

  async send(creds: Record<string, any>, msg: OutboundMessage): Promise<void> {
    const { accessToken, phoneNumberId } = creds;
    if (!accessToken || !phoneNumberId) return;
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: msg.customerRef,
        type: 'text',
        text: { body: msg.text },
      }),
    });
  },
};
