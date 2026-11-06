/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#30281e",
        muted: "#8d8070",
        brand: "#a87945",
        canvas: "#f7f3eb"
      },
      boxShadow: {
        card: "0 8px 32px rgba(93, 69, 39, 0.07)"
      }
    }
  },
  plugins: []
};
