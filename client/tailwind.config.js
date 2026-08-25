/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        unoRed: '#ED1C24',
        unoBlue: '#0054A6',
        unoGreen: '#00A651',
        unoYellow: '#FFF200',
        unoDark: '#12131A',
        unoCardBack: '#1E202E'
      },
      keyframes: {
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(-4%)' },
          '50%': { transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(255, 255, 255, 0.9)' },
        }
      },
      animation: {
        'bounce-slow': 'bounceSlow 2s infinite ease-in-out',
        'pulse-glow': 'pulseGlow 1.5s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}
