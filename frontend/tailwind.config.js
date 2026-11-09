/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F3EE', 100: '#E3EADF', 200: '#C9D6C3', 300: '#AFC2A7', 400: '#91A88A',
          500: '#748D6E', 600: '#647A62', 700: '#52684F', 800: '#40533E', 900: '#2F3D2D',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
