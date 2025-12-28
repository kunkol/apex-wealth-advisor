/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'apex-gold': '#D4AF37',
        'apex-navy': '#1a365d',
        'apex-dark': '#0f172a',
      },
    },
  },
  plugins: [],
}
