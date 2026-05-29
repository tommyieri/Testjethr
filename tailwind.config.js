/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#1E50FF',
          dark:    '#1440CC',
          tint:    '#EEF3FF',
          50:      '#EEF3FF',
          100:     '#DCE7FF',
          200:     '#B8CFFF',
          600:     '#1E50FF',
          700:     '#1440CC',
        },
        navy: {
          DEFAULT: '#0A1628',
          light:   '#132038',
          mid:     '#1E2F4A',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.65s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      boxShadow: {
        card:       '0 2px 12px rgba(10,22,40,0.06)',
        'card-hover': '0 8px 32px rgba(10,22,40,0.12)',
        brand:      '0 8px 24px rgba(30,80,255,0.28)',
      },
    },
  },
  plugins: [],
};
