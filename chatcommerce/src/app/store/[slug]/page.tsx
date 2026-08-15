import { ownerQuery } from '@/lib/db';
import { notFound } from 'next/navigation';
import { MessageCircle, Package } from 'lucide-react';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Public storefront / landing page for one vendor.
 * Only ever shows that vendor's active products. No secrets, no cross-tenant data.
 */
export default async function Storefront({ params }: { params: { slug: string } }) {
  const tenant = (
    await ownerQuery(
      `SELECT id, business_name, slug, status FROM tenants WHERE slug = $1 LIMIT 1`,
      [params.slug],
    )
  )[0];
  if (!tenant || tenant.status === 'suspended') notFound();

  const products = await ownerQuery(
    `SELECT id, title, description, price_cents, currency, image_url
       FROM products WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT 100`,
    [tenant.id],
  );

  const channel = (
    await ownerQuery(
      `SELECT type, external_id FROM channels WHERE tenant_id = $1 AND status = 'connected' ORDER BY created_at LIMIT 1`,
      [tenant.id],
    )
  )[0];

  const initial = (tenant.business_name?.[0] || 'S').toUpperCase();

  return (
    <main className="min-h-screen bg-cream">
      {/* Hero */}
      <header className="bg-forest-900 px-5 pb-16 pt-14 text-center text-white">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 font-display text-2xl font-extrabold text-forest-900">
          {initial}
        </div>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{tenant.business_name}</h1>
        <p className="mt-3 text-white/60">Browse below, then order on chat — it’s instant.</p>
        {channel?.type === 'whatsapp' && channel.external_id && (
          <a
            href={`https://wa.me/${channel.external_id}?text=menu`}
            className="btn-grass mt-7 inline-flex"
          >
            <MessageCircle className="h-4 w-4" /> Order on WhatsApp
          </a>
        )}
      </header>

      {/* Catalog */}
      <section className="mx-auto -mt-8 grid max-w-5xl gap-5 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: any) => (
          <div key={p.id} className="card overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="mb-4 h-48 w-full rounded-2xl object-cover" />
            ) : (
              <div className="mb-4 flex h-48 w-full items-center justify-center rounded-2xl bg-cream text-forest-900/20">
                <Package className="h-10 w-10" />
              </div>
            )}
            <h3 className="font-display font-bold text-forest-900">{p.title}</h3>
            {p.description && <p className="mt-1 line-clamp-2 text-sm text-forest-900/50">{p.description}</p>}
            <p className="mt-3 inline-block rounded-full bg-brand-50 px-3 py-1 font-display text-sm font-bold text-brand-700">
              {p.currency} {(Number(p.price_cents) / 100).toFixed(2)}
            </p>
          </div>
        ))}
        {products.length === 0 && (
          <div className="card col-span-full py-14 text-center text-forest-900/50">
            This store is being set up. Check back soon!
          </div>
        )}
      </section>

      <footer className="bg-forest-700 py-8 text-center text-sm text-white/50">
        Powered by <span className="font-display font-bold text-white">chatcommerce</span>
      </footer>
    </main>
  );
}
