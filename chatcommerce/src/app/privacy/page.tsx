import type { Metadata } from 'next';
import LegalShell, { H2 } from '../legal/LegalShell';

export const metadata: Metadata = { title: 'Privacy Policy — ChatCommerce' };

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="August 2026">
      <p>
        This Policy explains how ChatCommerce collects, uses and protects information when you use
        our platform. We act as a data processor for the customer data our vendors handle, and as a
        controller for vendor account data.
      </p>

      <H2>1. Information we collect</H2>
      <p>
        <strong>Vendor account data:</strong> your name, email, business name and password (stored
        only as a secure hash). <strong>Store data:</strong> products, orders and channel settings
        you add. <strong>Customer data:</strong> chat identifiers (e.g. phone number or chat ID) and
        order details created when your customers message your store. <strong>Technical data:</strong>{' '}
        logs and IP addresses used for security and abuse prevention.
      </p>

      <H2>2. How we use it</H2>
      <p>
        To operate the Service — authenticate you, route chat orders, process billing, prevent fraud
        and abuse, and provide support. We do not sell your data or your customers’ data.
      </p>

      <H2>3. How we protect it</H2>
      <p>
        Every vendor’s data is isolated at the database level (row-level security), so one vendor
        cannot access another’s data. Channel secrets and tokens are encrypted at rest
        (AES-256-GCM). Passwords are hashed with bcrypt. All traffic is served over HTTPS. Access is
        limited and audited.
      </p>

      <H2>4. Third parties</H2>
      <p>
        We use trusted providers to run the Service: hosting (Vercel), database (Neon), and payment
        processors (Paystack, Stripe). When you connect a channel or store (WhatsApp/Meta, Telegram,
        Shopify, WooCommerce), data is exchanged with those platforms under their own policies.
      </p>

      <H2>5. Data retention &amp; your rights</H2>
      <p>
        We keep data while your account is active and for a reasonable period afterward. You may
        request access, correction, export or deletion of your data by contacting us. Your customers
        may exercise their rights through you as the vendor; we will assist where required.
      </p>

      <H2>6. Contact</H2>
      <p>
        For any privacy request, email{' '}
        <a href="mailto:support@chatcommerce.app" className="font-semibold text-brand-700">
          support@chatcommerce.app
        </a>
        .
      </p>
    </LegalShell>
  );
}
