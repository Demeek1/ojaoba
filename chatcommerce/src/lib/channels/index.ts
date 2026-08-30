/**
 * Channel abstraction: every chat surface (WhatsApp, Telegram, Instagram)
 * implements the same interface so the chatbot engine is channel-agnostic.
 *
 * Per-tenant routing: each vendor's channel has its own webhook URL of the form
 *   /api/webhooks/<type>/<tenantId>?s=<webhook_secret>
 * so inbound events are attributed to exactly one tenant and verified by secret.
 */

export interface InboundMessage {
  customerRef: string; // phone number / chat id, unique per channel
  text: string;
  raw: unknown;
  id?: string; // provider message id, used for idempotency/replay protection
  mediaId?: string; // provider media id (for voice notes / images)
  mediaKind?: 'image' | 'audio';
}

export interface OutboundMessage {
  customerRef: string;
  text: string;
}

export interface ChannelConnector {
  type: 'whatsapp' | 'telegram' | 'instagram';
  /** Parse a provider webhook payload into normalized inbound messages. */
  parseInbound(body: any): InboundMessage[];
  /** Send a reply using the (decrypted) credentials for this tenant's channel. */
  send(creds: Record<string, any>, msg: OutboundMessage): Promise<void>;
  /** Optional GET verification handshake (Meta requires this for WhatsApp). */
  verify?(searchParams: URLSearchParams, creds: Record<string, any>): string | null;
  /**
   * Optional inbound signature verification (defense in depth on top of the
   * per-tenant URL secret). Return false to reject. Return true when there is
   * nothing to verify (e.g. the vendor hasn't configured an app secret), so
   * existing channels keep working.
   */
  verifySignature?(rawBody: string, headers: Headers, creds: Record<string, any>): boolean;
}

import { whatsapp } from './whatsapp';
import { telegram } from './telegram';
import { instagram } from './instagram';

const registry: Record<string, ChannelConnector> = {
  whatsapp,
  telegram,
  instagram,
};

export function getChannel(type: string): ChannelConnector | null {
  return registry[type] ?? null;
}

export const SUPPORTED_CHANNELS = Object.keys(registry);
