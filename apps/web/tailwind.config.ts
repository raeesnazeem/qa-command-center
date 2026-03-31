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
      },
    },
  },
  plugins: [],
} satisfies Config
