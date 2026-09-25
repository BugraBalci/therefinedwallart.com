/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0b",
        coal: "#121212",
        anthracite: "#181818",
        champagne: "#c8a97e",
      },
      fontFamily: {
        cinzel: ["Cinzel", "Cinzel Fallback", "serif"],
        inter: ["Inter", "Inter Fallback", "sans-serif"],
      },
      letterSpacing: {
        luxe: "0.32em",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  safelist: [
    "ease-[cubic-bezier(0.22,1,0.36,1)]",
    "shadow-[0_40px_120px_-20px_rgba(24,24,27,0.18)]",
    "dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.65)]",
    "lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]",
    "lg:h-[min(72vh,42rem)]",
    "lg:max-h-[calc(100dvh-6rem)]",
    "leading-[1.6]",
    "mt-[0.55em]",
    "lg:sticky",
    "object-top",
    "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]",
    "hover:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.10)]",
    "dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.45)]",
    "dark:hover:shadow-[0_8px_32px_-6px_rgba(0,0,0,0.6)]",
  ],
};
