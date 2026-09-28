/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#08090b',
        obsidianLighter: '#0e1117',
        cyanNeon: '#00f0ff',
        cyberGreen: '#10b981',
        crimsonEmber: '#ff3b30',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        glassBg: 'rgba(255, 255, 255, 0.03)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
