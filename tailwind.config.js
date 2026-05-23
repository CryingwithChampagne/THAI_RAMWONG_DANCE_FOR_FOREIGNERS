/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'thai-gold': '#D4AF37',
        'thai-dark': '#0B0F19',
        'thai-darker': '#05070A',
        'thai-card': '#121826',
        'thai-accent': '#B8860B',
      },
      fontFamily: {
        'serif': ['Georgia', 'serif'],
        'sans': ['system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'thai-pattern': "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Cpath d=%22M0,50 Q25,25 50,50 T100,50%22 stroke=%22%23D4AF37%22 stroke-width=%221%22 fill=%22none%22 opacity=%220.1%22/%3E%3C/svg%3E')",
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { textShadow: '0 0 5px rgba(212, 175, 55, 0.5)' },
          '50%': { textShadow: '0 0 20px rgba(212, 175, 55, 0.8)' },
        }
      },
      boxShadow: {
        'thai': '0 0 15px rgba(212, 175, 55, 0.4)',
        'thai-lg': '0 0 30px rgba(212, 175, 55, 0.2)',
      }
    },
  },
  plugins: [],
}
