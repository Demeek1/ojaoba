import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChatCommerce — Sell on WhatsApp, Telegram & Instagram',
  description:
    'Plug your store into chat. Vendors connect WhatsApp, Telegram or Instagram and their Shopify/WordPress catalog, and customers order right inside the chat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Rounded geometric display + clean body, loaded at runtime (build-safe). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gabarito:wght@500;600;700;800;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
