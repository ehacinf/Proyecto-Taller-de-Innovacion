/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B3C73",       // Azul oscuro
        primaryLight: "#3AAFFF",  // Celeste
        success: "#22C55E",       // Verde éxito
        softGray: "#F3F4F6",      // Gris suave
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

