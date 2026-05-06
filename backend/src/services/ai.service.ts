/**
 * Adaeze AI — Ojaoba's Nigerian customer service intelligence layer
 * Handles: natural language, typo correction, shopping list parsing, image recognition
 */
import axios from 'axios';

const API_KEY = () => process.env.ANTHROPIC_API_KEY || '';

const ADAEZE_SYSTEM = `You are Adaeze, a warm, smart and friendly Nigerian customer service representative for Ojaoba Food Market — Nigeria's freshest food marketplace. You speak naturally like a young educated Nigerian lady. You are professional but very relatable.

PERSONALITY:
- Warm, patient, and genuinely helpful — even when customers are rude or make mistakes
- Use light Nigerian expressions occasionally (e.g. "No worries at all!", "Ehen!", "Don't worry ehn,") but keep it professional
- Never use heavy pidgin — keep it clear and natural
- You understand Nigerian food culture deeply (you know ogi, egusi, ukazi, ukpaka, ogiri, etc.)
- You're quick and smart — you understand what customers mean even when they spell things wrong
- If a customer is frustrated, you acknowledge it warmly: "I totally understand, let me sort this out for you right away!"

RULES:
- Keep responses SHORT and conversational — max 2–3 sentences for general replies
- Never say you are an AI or a bot
- If asked your name, say "I'm Adaeze, your Ojaoba shopping assistant 😊"
- Always stay focused on helping them shop or resolve their issue
- If you genuinely can't help, say: "Let me connect you to our team for this one. Type *support* and someone will be with you shortly!"`;

async function callClaude(userMessage: string, systemOverride?: string): Promise<string | null> {
  const key = API_KEY();
  if (!key) return null;
  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: systemOverride || ADAEZE_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 8000,
      }
    );
    return res.data.content?.[0]?.text?.trim() || null;
  } catch (e: any) {
    console.error('[Adaeze AI]', e.response?.data?.error?.message || e.message);
    return null;
  }
}

async function callClaudeVision(imageUrl: string, mediaType: string): Promise<string | null> {
  const key = API_KEY();
  if (!key) return null;
  try {
    // Download the image as base64
    const imgRes = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` },
      timeout: 15000,
    });
    const base64 = Buffer.from(imgRes.data).toString('base64');
    const type = (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: `You are a Nigerian food product identifier. Given an image, identify the food product or grocery item shown. Return ONLY the product name (e.g. "Palm Oil", "Indomie Noodles", "Tomato Paste", "Rice", "Chicken"). If it is a shopping list photo, extract each item on the list separated by commas. Be concise.`,
        messages: [{
          role: 'user',
          content: [{
            type: 'image',
            source: { type: 'base64', media_type: type, data: base64 },
          }, {
            type: 'text',
            text: 'What product(s) is shown in this image? If it is a shopping list, list every item.',
          }],
        }],
      },
      {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 20000,
      }
    );
    return res.data.content?.[0]?.text?.trim() || null;
  } catch (e: any) {
    console.error('[Adaeze Vision]', e.response?.data?.error?.message || e.message);
    return null;
  }
}

/**
 * Correct/interpret a potentially misspelled product query.
 * Returns the best search term to use.
 */
export async function interpretSearch(raw: string): Promise<string> {
  const key = API_KEY();
  if (!key) return raw; // fallback to original if no AI
  const result = await callClaude(
    `A Nigerian customer typed this product search: "${raw}"

    This might have spelling mistakes or be in pidgin/informal language.
    Return ONLY the corrected standard English product name to search for.
    Examples: "pal oil" → "palm oil", "indomii" → "indomie", "tomatoe past" → "tomato paste", "ogi" → "ogi", "semovita" → "semovita"
    Just return the corrected search term, nothing else.`,
    'You are a Nigerian grocery search assistant. Correct misspelled product names. Return only the corrected term.'
  );
  return result || raw;
}

/**
 * Parse a shopping list message into individual product names.
 * e.g. "I need rice, palm oil, indomie x3 and Milo" → ["rice", "palm oil", "indomie", "milo"]
 */
export async function parseShoppingList(message: string): Promise<string[]> {
  const key = API_KEY();
  if (!key) return [];
  const result = await callClaude(
    `Extract individual grocery/food product names from this Nigerian customer message: "${message}"

    Return ONLY a JSON array of product name strings. Include quantities if specified as "item:qty".
    Example output: ["rice", "palm oil", "indomie:3", "milo", "tomato paste"]
    If this is NOT a shopping list (just a single item or question), return an empty array: []`,
    'You are a Nigerian grocery list parser. Extract product names from messages. Return only valid JSON array.'
  );
  if (!result) return [];
  try {
    const arr = JSON.parse(result.replace(/```json|```/g, '').trim());
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Identify product(s) from a WhatsApp image.
 * Returns list of product search terms.
 */
export async function identifyProductFromImage(mediaUrl: string, mediaType: string): Promise<string[]> {
  const identified = await callClaudeVision(mediaUrl, mediaType);
  if (!identified) return [];
  // Split by comma if multiple items (shopping list photo)
  return identified.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Generate a warm Adaeze reply for edge cases / free-text conversation.
 */
export async function adaezeSay(userMessage: string, context: string = ''): Promise<string | null> {
  return callClaude(`${context ? `Context: ${context}\n\n` : ''}Customer says: "${userMessage}"`);
}

/**
 * Check if a message looks like a multi-item shopping list
 */
export function looksLikeShoppingList(text: string): boolean {
  const cleaned = text.toLowerCase();
  // Contains comma-separated items OR numbered list OR "and" connecting 3+ items OR explicit keywords
  const commaCount = (cleaned.match(/,/g) || []).length;
  const andCount = (cleaned.match(/\band\b/g) || []).length;
  const listKeywords = /\b(need|want|buy|order|get me|send me|i want|my list|shopping)\b/i.test(cleaned);
  return commaCount >= 2 || (andCount >= 2 && listKeywords) || (listKeywords && commaCount >= 1);
}
