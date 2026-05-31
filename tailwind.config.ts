import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gozipp: {
          green: '#22C55E', // Electric Green
          navy: '#0F172A',  // Dark Navy
          white: '#FFFFFF',
          gray: '#F8FAFC',  // Light Gray
          blue: '#06B6D4',  // Speed Blue
        },
        // Legacy support during transition (optional, but good for stability)
        winno: {
          green: '#22C55E',
          navy: '#0F172A',
          gray: '#F8FAFC',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-prompt)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-kanit)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'premium': '0 20px 50px rgba(0,0,0,0.1)',
        'gozipp': '0 10px 30px rgba(34, 197, 94, 0.2)',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
