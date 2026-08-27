import { ownerQuery } from '@/lib/db';
import { notFound } from 'next/navigation';
import { MessageCircle, Package, ShieldCheck, Truck, BadgeCheck, Store as StoreIcon } from 'lucide-react';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Public storefront for one vendor. Only ever shows that vendor's active
 * products. No secrets, no cross-tenant data.
 */
export default async function Storefront({ params }: { params: { slug: string } }) {
  const tenant = (
    await ownerQuery(`SELECT id, business_name, slug, status FROM tenants WHERE slug = $1 LIMIT 1`, [params.slug])
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
  const waHref = channel?.type === 'whatsapp' && channel.external_id ? `https://wa.me/${channel.external_id}?text=menu` : null;

  return (
    <main className="min-h-screen bg-cream">
      {/* Hero: cover band + overlapping avatar */}
      <header className="relative">
        <div className="grad-lime h-40 w-full sm:h-52" />
        <div className="mx-auto max-w-5xl px-5">
          <div className="-mt-12 flex flex-col items-center text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-cream bg-forest-900 font-display text-4xl font-extrabold text-brand-400 shadow-soft sm:h-28 sm:w-28">
              {initial}
            </div>
            <div className="mt-4 sm:mb-2 sm:ml-5 sm:mt-0">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-forest-900 sm:text-4xl">{tenant.business_name}</h1>
                <BadgeCheck className="h-6 w-6 text-brand-600" />
              </div>
              <p className="mt-1 flex items-center justify-center gap-2 text-sm text-forest-900/60 sm:justify-start">
                <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" /> Online now · orders in chat
              </p>
            </div>
            {waHref && (
              <a href={waHref} className="btn-grass mt-5 sm:mb-2 sm:ml-auto">
                <MessageCircle className="h-4 w-4" /> Order on WhatsApp
              </a>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-y border-forest-900/10 py-3 text-xs font-medium text-forest-900/60 sm:justify-start">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" /> Secure ordering</span>
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4 text-brand-600" /> Reply in chat</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4 text-brand-600" /> Fast delivery</span>
          </div>
        </div>
      </header>

      {/* Catalog */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-forest-900">
            {products.length > 0 ? `${products.length} item${products.length > 1 ? 's' : ''} available` : 'Catalog'}
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => (
            <div key={p.id} className="group card overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-soft">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 w-full items-center justify-center bg-cream text-forest-900/20"><Package className="h-10 w-10" /></div>
              )}
              <div className="p-5">
                <h3 className="font-display font-bold text-forest-900">{p.title}</h3>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-forest-900/50">{p.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-display text-lg font-extrabold text-forest-900">
                    {p.currency} {(Number(p.price_cents) / 100).toLocaleString()}
                  </span>
                  {waHref && (
                    <a
                      href={`https://wa.me/${channel.external_id}?text=${encodeURIComponent('I want to order: ' + p.title)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-grass px-3 py-1.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                    >
                      <MessageCircle className="h-3 w-3" /> Order
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="card col-span-full flex flex-col items-center py-16 text-center text-forest-900/50">
              <StoreIcon className="h-10 w-10 opacity-30" />
              <p className="mt-3 text-sm">This store is being set up. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Sticky mobile order bar */}
      {waHref && (
        <div className="sticky bottom-0 z-10 border-t border-forest-900/10 bg-cream/90 px-5 py-3 backdrop-blur sm:hidden">
          <a href={waHref} className="btn-grass w-full">
            <MessageCircle className="h-4 w-4" /> Order on WhatsApp
          </a>
        </div>
      )}

      <footer className="bg-forest-700 py-8 text-center text-sm text-white/50">
        Powered by <span className="font-display font-bold text-white">chatcommerce</span>
      </footer>
    </main>
  );
}
