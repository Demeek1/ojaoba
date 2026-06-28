'use client';
/** Anonymous, privacy-friendly behaviour tracking for the standalone assistant. */
import api from './api';

type TrackEvent =
  | 'page_view' | 'product_view' | 'add_to_cart' | 'remove_from_cart'
  | 'search' | 'ai_search' | 'checkout_start' | 'purchase';

interface QueuedEvent {
  event: TrackEvent;
  productId?: string;
  path?: string;
  query?: string;
  valueKobo?: number;
  metadata?: Record<string, any>;
}

const SID_KEY = 'oja_assistant_sid';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}
export function getTrackSessionId(): string { return getSessionId(); }

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function device(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function flush() {
  if (!queue.length) return;
  const events = queue; queue = []; timer = null;
  api.post('/track', { sessionId: getSessionId(), events }).catch(() => {});
}

export function track(event: TrackEvent, data: Omit<QueuedEvent, 'event'> = {}) {
  if (typeof window === 'undefined') return;
  queue.push({
    event, ...data,
    path: data.path ?? window.location.pathname,
    metadata: { device: device(), surface: 'assistant_site', ...(data.metadata || {}) },
  });
  if (event === 'purchase' || event === 'checkout_start') { flush(); return; }
  if (!timer) timer = setTimeout(flush, 2500);
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
