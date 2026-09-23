/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        transit: {
          flight: '#3b82f6',
          train: '#10b981',
          bus: '#f59e0b',
          car: '#8b5cf6',
          ferry: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['System', '-apple-system', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
