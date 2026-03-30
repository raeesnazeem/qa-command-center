import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: '#1E3A5F',
        orange: '#F97316',
      },
    },
  },
  plugins: [],
} satisfies Config
