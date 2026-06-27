/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vendor product images can come from any store (Shopify CDN, WooCommerce, etc.)
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Harden default response headers — defense in depth for a multi-tenant SaaS.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
