/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#18233c",
        muted: "#69758b",
        brand: "#6558e8",
        canvas: "#f5f7ff"
      },
      boxShadow: {
        card: "0 12px 32px rgba(49, 56, 111, 0.07)"
      }
    }
  },
  plugins: []
};
