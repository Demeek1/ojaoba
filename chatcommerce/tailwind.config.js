/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // conectr-style palette: lime/grass green + deep forest-black.
        brand: {
          50: '#f2fbe7',
          100: '#e2f6c9',
          200: '#c8ee9a',
          300: '#a9e166',
          400: '#8ed64a',
          500: '#7ed957', // signature lime
          600: '#54bd3f',
          700: '#3f9a30',
          800: '#356f2a',
          900: '#1f4019',
        },
        grass: '#3fc46a', // solid CTA green (e.g. "View my community")
        lemon: '#e9e21f', // gradient end (yellow)
        // Deep forest backgrounds
        forest: {
          900: '#0b150d', // page dark
          800: '#0e1a10',
          700: '#102a19', // footer / cards on dark
          600: '#16321f',
        },
        cream: '#f4f8ee', // pale mint light sections
      },
      fontFamily: {
        // Gabarito = rounded geometric display (loaded via <link> in layout).
        display: ['Gabarito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      boxShadow: {
        soft: '0 18px 50px -15px rgba(0, 0, 0, 0.35)',
        card: '0 10px 30px -12px rgba(16, 42, 25, 0.15)',
      },
    },
  },
  plugins: [],
};
