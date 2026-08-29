'use client';
import { useEffect } from 'react';

/** Anonymous store-view ping (no PII). */
export default function Tracker({ tenantId }: { tenantId: string }) {
  useEffect(() => {
    try {
      const k = 'cc_sid_' + tenantId;
      let sid = localStorage.getItem(k);
      if (!sid) { sid = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, sid); }
      fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, sessionId: sid, type: 'store_view' }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [tenantId]);
  return null;
}
