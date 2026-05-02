import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Ojaoba — Nigeria\'s Freshest Food Marketplace',
  description: 'Order fresh food, groceries and more. Shop online or order directly on WhatsApp — delivered to your door.',
  keywords: 'food, groceries, Nigeria, Lagos, delivery, fresh food, ojaoba',
  openGraph: {
    title: 'Ojaoba Food Market',
    description: 'Fresh food delivered to your door. Shop online or order on WhatsApp.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
