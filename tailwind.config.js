/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        border: "#E2E8F0",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        brand: {
          blue: "#2563EB",
          gray: "#475569",
          muted: "#94A3B8",
          steel: "#0F172A",
        },
      },
    },
  },
  plugins: [],
}
