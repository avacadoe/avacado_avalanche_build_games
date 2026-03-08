/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "cyber-black": "#121212",
        "cyber-dark": "#1E1E1E",
        "cyber-green": "#39FF14",
        "cyber-blue": "#00D1FF",
        "cyber-purple": "#A020F0",
        "cyber-gray": "#D3D3D3",
        "cyber-red": "#FF3131",
      },
      fontFamily: {
        mono: ['"Anonymous Pro"', '"Roboto Mono"', "monospace"],
        sans: ['"Open Sans"', "sans-serif"],
      },
      animation: {
        "neon-glow": "neon-glow 1.5s ease-in-out infinite alternate",
      },
      keyframes: {
        "neon-glow": {
          "0%": {
            "box-shadow": "0 0 5px #39FF14, 0 0 10px #39FF14, 0 0 15px #39FF14",
          },
          "100%": {
            "box-shadow":
              "0 0 10px #39FF14, 0 0 20px #39FF14, 0 0 30px #39FF14",
          },
        },
      },
    },
  },
  plugins: [],
};
