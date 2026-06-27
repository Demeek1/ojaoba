import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChatCommerce — Sell on WhatsApp, Telegram & Instagram',
  description:
    'Plug your store into chat. Vendors connect WhatsApp, Telegram or Instagram and their Shopify/WooCommerce catalog, and customers order right inside the chat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
