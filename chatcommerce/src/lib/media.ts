/**
 * Inbound media understanding for chat channels (ported from the old Adaeze
 * assistant, kept per-vendor). Voice notes → text via Groq Whisper (free);
 * images (product photos / shopping-list screenshots) → product name(s) via
 * Claude vision. All best-effort: on any failure we return null and the caller
 * asks the customer to type instead.
 */

/** Resolve a WhatsApp media id to a temporary download URL + mime type. */
async function whatsappMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mime: string } | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.url ? { url: data.url, mime: data.mime_type || '' } : null;
  } catch {
    return null;
  }
}

async function download(url: string, accessToken: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Transcribe an audio buffer with Groq Whisper. */
async function transcribe(audio: Buffer): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/ogg' }), 'voice.ogg');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'en');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return (data?.text || '').trim() || null;
  } catch {
    return null;
  }
}

/** Identify product(s) in an image with Claude vision. Returns a search phrase. */
async function identifyImage(img: Buffer, mime: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime) ? mime : 'image/jpeg';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system:
          'You identify products from an image for a shop. Return ONLY the product name(s) — nothing else. If it is a list/screenshot of items, return them separated by commas. Be concise.',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: img.toString('base64') } },
              { type: 'text', text: 'What product(s) is shown? If it is a list, list every item.' },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return (data?.content?.[0]?.text || '').trim() || null;
  } catch {
    return null;
  }
}

/**
 * Turn an inbound media message into text the chatbot can act on.
 * `kind` is 'audio' or 'image'; creds must contain the channel access token.
 * Returns the resolved text, or null if it couldn't be understood.
 */
export async function resolveMedia(
  kind: 'audio' | 'image',
  mediaId: string,
  creds: Record<string, any>,
): Promise<string | null> {
  const accessToken = creds?.accessToken;
  if (!accessToken || !mediaId) return null;
  const media = await whatsappMediaUrl(mediaId, accessToken);
  if (!media) return null;
  const buf = await download(media.url, accessToken);
  if (!buf) return null;
  return kind === 'audio' ? transcribe(buf) : identifyImage(buf, media.mime);
}
