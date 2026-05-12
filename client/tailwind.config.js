/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0d1117',
        card: '#161b22',
        border: '#21262d',
        'price-up': '#00d97e',
        'price-down': '#ff4757',
        'text-primary': '#e6edf3',
        'text-secondary': '#7d8590',
        accent: '#388bfd',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        flashUp: {
          '0%': { backgroundColor: 'rgba(0, 217, 126, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(255, 71, 87, 0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        'flash-up': 'flashUp 0.4s ease-out',
        'flash-down': 'flashDown 0.4s ease-out',
      },
    },
  },
  plugins: [],
};
