/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        royal: { DEFAULT: '#2D0A4E', deep: '#1E0735', night: '#170528' },
        gold:  { DEFAULT: '#F59E0B', dark: '#D97706' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
