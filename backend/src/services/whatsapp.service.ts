import axios from 'axios';

const WA_BASE = 'https://graph.facebook.com/v20.0';
const headers = () => ({ Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' });
const pid = () => process.env.WA_PHONE_NUMBER_ID!;

async function send(payload: object) {
  try {
    await axios.post(`${WA_BASE}/${pid()}/messages`, payload, { headers: headers(), timeout: 10000 });
  } catch (e: any) {
    console.error('[WA] Send failed:', e.response?.data?.error?.message || e.message);
  }
}

export const sendText = (to: string, text: string) =>
  send({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text, preview_url: false } });

export const sendButtons = (to: string, body: string, buttons: { id: string; title: string }[], header?: string, footer?: string, imageUrl?: string) => {
  const interactive: any = {
    type: 'button', body: { text: body },
    action: { buttons: buttons.slice(0,3).map(b => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0,20) } })) },
  };
  if (imageUrl) interactive.header = { type: 'image', image: { link: imageUrl } };
  else if (header) interactive.header = { type: 'text', text: header.slice(0,60) };
  if (footer) interactive.footer = { text: footer.slice(0,60) };
  return send({ messaging_product: 'whatsapp', to, type: 'interactive', interactive });
};

export const sendList = (to: string, header: string, body: string, btnLabel: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[], footer?: string) => {
  const interactive: any = {
    type: 'list',
    header: { type: 'text', text: header.slice(0,60) },
    body: { text: body },
    action: { button: btnLabel.slice(0,20), sections: sections.map(s => ({ title: s.title.slice(0,24), rows: s.rows.slice(0,10).map(r => ({ id: r.id.slice(0,200), title: r.title.slice(0,24), ...(r.description ? { description: r.description.slice(0,72) } : {}) })) })) },
  };
  if (footer) interactive.footer = { text: footer.slice(0,60) };
  return send({ messaging_product: 'whatsapp', to, type: 'interactive', interactive });
};

export const sendImage = (to: string, url: string, caption: string) =>
  send({ messaging_product: 'whatsapp', to, type: 'image', image: { link: url, caption: caption.slice(0,1024) } });

export const markRead = (messageId: string) =>
  axios.post(`${WA_BASE}/${pid()}/messages`, { messaging_product: 'whatsapp', status: 'read', message_id: messageId }, { headers: headers() }).catch(() => {});

export const verifyWebhook = (mode: string, token: string, challenge: string): string | null =>
  (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) ? challenge : null;

export interface IncomingMsg { from: string; messageId: string; type: string; text?: string; interactiveId?: string; profileName?: string; }

export const parseWebhook = (body: any): IncomingMsg | null => {
  try {
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return null;
    const profile = body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || '';
    const base: IncomingMsg = { from: msg.from, messageId: msg.id, type: msg.type, profileName: profile };
    if (msg.type === 'text') base.text = msg.text?.body?.trim() || '';
    else if (msg.type === 'interactive') {
      const r = msg.interactive?.button_reply || msg.interactive?.list_reply;
      base.interactiveId = r?.id || '';
      base.text = r?.title || '';
    } else base.text = msg.type;
    return base;
  } catch { return null; }
};
