import { ownerQuery } from '@/lib/db';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';

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

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-brand-900 py-12 text-center text-white">
        <h1 className="text-3xl font-extrabold">{tenant.business_name}</h1>
        <p className="mt-2 text-brand-100">Browse below, then order on chat.</p>
        {channel?.type === 'whatsapp' && channel.external_id && (
          <a
            href={`https://wa.me/${channel.external_id}?text=menu`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 font-semibold"
          >
            <MessageCircle className="h-4 w-4" /> Order on WhatsApp
          </a>
        )}
      </header>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p: any) => (
          <div key={p.id} className="card">
            {p.image_url && <img src={p.image_url} alt="" className="mb-3 h-44 w-full rounded-lg object-cover" />}
            <h3 className="font-semibold">{p.title}</h3>
            {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
            <p className="mt-2 font-bold text-brand-700">
              {p.currency} {(Number(p.price_cents) / 100).toFixed(2)}
            </p>
          </div>
        ))}
        {products.length === 0 && (
          <p className="col-span-full text-center text-slate-500">This store is being set up. Check back soon!</p>
        )}
      </section>

      <footer className="py-8 text-center text-sm text-slate-400">
        Powered by ChatCommerce
      </footer>
    </main>
  );
}
