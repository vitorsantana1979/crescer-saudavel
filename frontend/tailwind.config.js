/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003366',
          dark: '#002244',
          light: '#004488',
        },
        secondary: {
          DEFAULT: '#C11C84',
          dark: '#A0156B',
          light: '#E02A9D',
        },
      },
    },
  },
  plugins: [],
}


