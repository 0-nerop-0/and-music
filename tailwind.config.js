/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Material 3 Dark Theme
        surface: {
          DEFAULT: '#1c1b1f',
          container: '#211f26',
          bright: '#3b383e',
          dim: '#141218'
        },
        primary: {
          DEFAULT: '#d0bcff',
          container: '#4f378b'
        },
        secondary: {
          DEFAULT: '#ccc2dc',
          container: '#4a4458'
        },
        error: {
          DEFAULT: '#f2b8b5',
          container: '#8c1d18'
        }
      }
    },
  },
  plugins: [],
}
