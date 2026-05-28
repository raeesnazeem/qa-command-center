import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        accent: "#93C0B1",
        // "bg-main": "#e5ecea", //good med cyan
        // "bg-main": "#eaf0ee", //good slightly lighter cyan
        "bg-main": "#F9F7F5", //good slightly lighter cyan
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config
