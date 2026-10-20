import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#e8edf2",
          100: "#c5d0db",
          200: "#9fb0c1",
          300: "#7890a7",
          400: "#587590",
          500: "#3a5c79",
          600: "#1e4060",
          700: "#0e2a44",
          800: "#0C1D2F",
          900: "#080f1a",
          950: "#040810",
        },
        gold: {
          50:  "#fdf9ed",
          100: "#f9f0cc",
          200: "#f3de96",
          300: "#ecc95f",
          DEFAULT: "#E1BF54",
          400: "#e1bf54",
          500: "#d4a830",
          600: "#b88820",
          700: "#8f6516",
          800: "#674810",
          900: "#3f2c0a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
