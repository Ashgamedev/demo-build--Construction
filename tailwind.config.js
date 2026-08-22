/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f6f9',
          100: '#bbdce4',
          400: '#548ca7',
          500: '#246ca4',
          600: '#265a7b',
          900: '#1a3c54',
        }
      }
    },
  },
  plugins: [],
}
