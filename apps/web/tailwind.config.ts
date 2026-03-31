import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        accent: '#93C0B1',
        'bg-main': '#FAFAFA',
        navy: '#1E3A5F', // Keeping for transition, but will replace in components
        orange: '#F97316', // Keeping for transition, but will replace in components
      },
    },
  },
  plugins: [],
} satisfies Config
