import type { ChannelConnector, InboundMessage, OutboundMessage } from './index';

/**
 * Instagram Direct via Meta Messenger Platform (Instagram messaging).
 * Credentials (encrypted at rest): { accessToken, igId, verifyToken }
 *
 * Shares Meta's webhook shape with Messenger. Sending uses the Graph API
 * `/me/messages` with the Instagram-scoped page access token.
 */
export const instagram: ChannelConnector = {
  type: 'instagram',

  verify(params, creds) {
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
        for (const ev of entry?.messaging ?? []) {
          const sender = ev?.sender?.id;
          const text = ev?.message?.text;
          if (sender && text) out.push({ customerRef: String(sender), text: String(text), raw: ev });
        }
      }
    } catch {
      /* ignore */
    }
    return out;
  },

  async send(creds: Record<string, any>, msg: OutboundMessage): Promise<void> {
    const { accessToken } = creds;
    if (!accessToken) return;
    await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: msg.customerRef }, message: { text: msg.text } }),
    });
  },
};
