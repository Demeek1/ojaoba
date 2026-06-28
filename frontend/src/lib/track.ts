'use client';
/**
 * Lightweight, privacy-friendly customer-behaviour tracking for the storefront.
 * Anonymous: a random session id is stored in localStorage (no PII).
 * Events are batched and flushed to /api/track so the admin behaviour dashboard
 * can show funnels, top products, and AI engagement.
 */
import api from './api';

type TrackEvent =
  | 'page_view' | 'product_view' | 'add_to_cart' | 'remove_from_cart'
  | 'search' | 'ai_search' | 'checkout_start' | 'purchase' | 'category_view' | 'favorite';

interface QueuedEvent {
  event: TrackEvent;
  productId?: string;
  path?: string;
  query?: string;
  valueKobo?: number;
  metadata?: Record<string, any>;
}

const SID_KEY = 'ojaoba_sid';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = (crypto?.randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export function getTrackSessionId(): string {
  return getSessionId();
}

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function device(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function flush() {
  if (!queue.length) return;
  const events = queue;
  queue = [];
  timer = null;
  api.post('/track', { sessionId: getSessionId(), events }).catch(() => {});
}

export function track(event: TrackEvent, data: Omit<QueuedEvent, 'event'> = {}) {
  if (typeof window === 'undefined') return;
  queue.push({
    event,
    ...data,
    path: data.path ?? window.location.pathname,
    metadata: { device: device(), ...(data.metadata || {}) },
  });
  // Flush important conversion events immediately; batch the rest
  if (event === 'purchase' || event === 'checkout_start') { flush(); return; }
  if (!timer) timer = setTimeout(flush, 2500);
}

// Best-effort flush when the tab is hidden/closed
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
