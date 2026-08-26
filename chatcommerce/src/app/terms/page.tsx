import type { Metadata } from 'next';
import LegalShell, { H2 } from '../legal/LegalShell';

export const metadata: Metadata = { title: 'Terms of Service — ChatCommerce' };

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="August 2026">
      <p>
        These Terms govern your use of ChatCommerce (the “Service”), a platform that lets vendors
        sell through chat channels such as WhatsApp, Telegram and Instagram. By creating an account
        you agree to these Terms.
      </p>

      <H2>1. Your account</H2>
      <p>
        You are responsible for the activity under your account and for keeping your password
        secure. You must provide accurate information and be legally able to enter this agreement.
        One account may operate one or more stores subject to your plan.
      </p>

      <H2>2. Acceptable use</H2>
      <p>
        You agree not to use the Service to sell illegal goods, send spam or unsolicited messages,
        infringe others’ rights, or violate the policies of connected platforms (including Meta’s
        WhatsApp Business and Commerce policies). We may suspend accounts that breach these rules.
      </p>

      <H2>3. Vendor content &amp; customers</H2>
      <p>
        You own your products, catalog and customer data. You are responsible for fulfilling orders,
        honoring prices, handling refunds, and complying with consumer-protection and tax laws in
        your market. ChatCommerce is a tool that facilitates ordering; it is not a party to the sale
        between you and your customers.
      </p>

      <H2>4. Fees &amp; billing</H2>
      <p>
        Paid plans are billed in advance on a recurring basis through our payment processors
        (e.g. Paystack, Stripe). Messaging costs charged by third-party platforms (e.g. WhatsApp
        per-message fees) may be passed through. You can cancel at any time; fees already paid are
        non-refundable except where required by law.
      </p>

      <H2>5. Availability &amp; changes</H2>
      <p>
        We work to keep the Service available but do not guarantee uninterrupted operation. We may
        update features and these Terms; material changes will be posted here with a new date.
      </p>

      <H2>6. Liability</H2>
      <p>
        The Service is provided “as is”. To the maximum extent permitted by law, ChatCommerce is not
        liable for indirect or consequential losses, lost profits, or losses arising from third-party
        platforms or your customers. Our total liability is limited to the fees you paid in the prior
        three months.
      </p>

      <H2>7. Termination</H2>
      <p>
        You may close your account at any time. We may suspend or terminate accounts that violate
        these Terms or the law. On termination you may export your data for a reasonable period.
      </p>
    </LegalShell>
  );
}
