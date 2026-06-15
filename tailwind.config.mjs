/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // beout App visual identity
        ink: {
          950: "#0B1220",
          900: "#0F172A", // base
          800: "#1E293B",
          700: "#334155",
        },
        emerald: {
          400: "#34D399",
          500: "#10B981", // accent
          600: "#059669",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16,185,129,0.25), 0 10px 30px -10px rgba(16,185,129,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
