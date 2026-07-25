/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './**/*.{ts,tsx}', '!./node_modules/**'],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FBF0EA', 100: '#F5DDD0', 200: '#EAC0AC', 300: '#DEA084',
          400: '#D07F5C', 500: '#C4693F', DEFAULT: '#C15F3C', 600: '#C15F3C',
          700: '#8C4429', 800: '#723620', 900: '#5C2C1A',
        },
        sand: {
          50: '#FBF6EF', 100: '#F5EDE0', 200: '#EEE2CE', 300: '#E8DCC8',
          400: '#D6C4A8', 500: '#B8A688', 600: '#93826A', 700: '#6B5A48',
          800: '#4F4237', 900: '#3A322C',
        },
      },
      fontFamily: {
        serif: ['Fraunces Variable', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
