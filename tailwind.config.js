/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          bg: "#0B2E1D",          // Deep page backdrop
          primary: "#0F3822",     // Core action CTA & active tabs
          hover: "#154A2E",       // Hover state
          dark: "#081E13",        // Darker shadow forest
          text: "#11291B",        // Primary charcoal-forest typography
          muted: "#6B7F72",       // Soft olive gray
          accent: "#1E5E38",      // Vibrant green text
          lime: "#99E35E",        // Electric sage/lime accent
          limeDark: "#7CB342",
          mint: "#F4F9F5",        // Soft tinted mint canvas
          mintSoft: "#E9F3ED",    // Subtle container fill
          mintLight: "#D5E8DC",
          card: "#FFFFFF",        // Pure crisp white card
          border: "rgba(15, 56, 34, 0.08)"
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 56, 34, 0.06)',
        'card': '0 8px 30px -4px rgba(15, 56, 34, 0.08)',
        'tactile': '0 4px 0 0 #081E13',
      },
      borderRadius: {
        '28': '28px',
        '32': '32px',
      }
    },
  },
  plugins: [],
}
