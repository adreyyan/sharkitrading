import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sf-pro)'],
        'sf-pro': ['var(--font-sf-pro)'],
        display: ['var(--font-sf-pro)'],
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      letterSpacing: {
        'tight': '-0.02em',
        'snug': '-0.01em',
        'normal': '-0.005em',
      },

    },
  },
  plugins: [],
}

export default config 