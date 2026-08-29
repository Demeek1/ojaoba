/**
 * SINGLE SOURCE OF TRUTH for pricing plans.
 * The landing page, /pricing, and the signup/billing flow all import from here,
 * so NGN and USD figures can never drift apart again.
 *
 * WhatsApp/Meta per-message fees and payment-provider fees are passed through
 * transparently and are NOT included in these subscription prices.
 */

export type Currency = 'NGN' | 'USD';

export interface Plan {
  id: 'starter' | 'growth' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  ngn: number | null; // monthly, null = custom
  usd: number | null;
  highlight?: boolean;
  limits: { channels: string; seats: string; products: string; ai: string };
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo sellers getting started',
    ngn: 15000,
    usd: 39,
    limits: { channels: '1 channel', seats: '1 seat', products: '100 products', ai: '1,000 AI replies/mo' },
    features: ['1 sales channel', 'Chat ordering', 'Manual or CSV catalog', 'Storefront page', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Growing shops with a small team',
    ngn: 45000,
    usd: 119,
    highlight: true,
    limits: { channels: 'Up to 3 channels', seats: '3 seats', products: 'Unlimited*', ai: '5,000 AI replies/mo' },
    features: ['Everything in Starter', 'Shopify / WooCommerce sync', 'Team inbox', 'Order dashboard', 'Priority email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'High-volume sellers & teams',
    ngn: 130000,
    usd: 349,
    limits: { channels: 'All live channels', seats: '10 seats', products: 'Unlimited*', ai: '20,000 AI replies/mo' },
    features: ['Everything in Growth', 'Automations', 'Analytics', 'API & webhooks', 'AI concierge', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Scale, SSO & dedicated support',
    ngn: null,
    usd: null,
    limits: { channels: 'Custom', seats: 'Custom', products: 'Custom', ai: 'Custom' },
    features: ['SSO & advanced roles', 'Dedicated support & SLA', 'Regional data options', 'Custom integrations'],
  },
];

export function formatPrice(plan: Plan, currency: Currency): string {
  if (plan.ngn === null || plan.usd === null) return 'Custom';
  return currency === 'NGN'
    ? `₦${plan.ngn.toLocaleString()}`
    : `$${plan.usd.toLocaleString()}`;
}

/** Default currency from a Vercel geo header (NG → NGN, else USD). */
export function currencyForCountry(country?: string | null): Currency {
  return (country || '').toUpperCase() === 'NG' ? 'NGN' : 'USD';
}
