'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Code2, Copy, Check } from 'lucide-react';

export default function WidgetSnippet() {
  const [tid, setTid] = useState('');
  const [name, setName] = useState('Chat with us');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ tenant: any }>('/api/vendor/me')
      .then((r) => { setTid(r.tenant.id); if (r.tenant.business_name) setName(r.tenant.business_name); })
      .catch(() => {});
  }, []);

  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const snippet = `<script src="${base}/widget.js" data-store="${tid}" data-name="${name}"></script>`;

  function copy() {
    navigator.clipboard?.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  if (!tid) return null;

  return (
    <div className="card mt-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Code2 className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-forest-900">Website chat widget</h2>
          <p className="text-sm text-forest-900/60">Add a chat bubble to any website — customers shop your catalogue right there.</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-forest-900/70">Paste this before <code>&lt;/body&gt;</code> on your site:</p>
      <div className="mt-2 flex items-start gap-2">
        <code className="block flex-1 break-all rounded-xl bg-forest-900 p-3 text-xs text-brand-300">{snippet}</code>
        <button onClick={copy} className="btn-ghost-dark shrink-0 px-3 py-2 text-sm">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 text-xs text-forest-900/50">Works on any site — WordPress, Wix, Shopify, plain HTML. It uses your live products.</p>
    </div>
  );
}
