import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ojaoba Assistant — Chat to shop with Adaeze',
  description: "Ojaoba's AI shopping assistant. Just chat — find products, plan meals and get everything delivered. Nigeria's freshest food market.",
  keywords: 'ojaoba, ai assistant, food, groceries, Nigeria, chat shopping, Adaeze',
  openGraph: {
    title: 'Ojaoba Assistant',
    description: 'Chat to shop. Find products, plan meals, and order — all in one conversation.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#2D0A4E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
