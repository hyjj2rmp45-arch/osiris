/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Obsidian foundation
        obsidian: {
          DEFAULT: '#050507',
          light: '#0A0A0D',
          surface: '#111114',
          elevated: '#191920',
          border: '#202027',
          muted: '#2A2A33',
        },
        // Egyptian Gold accents
        gold: {
          DEFAULT: '#D4AF37',
          bright: '#EFBF04',
          pale: '#F5E6A8',
          dim: '#8C7B00',
        },
        success: '#2D8A4E',
        error: '#C0392B',
        warning: '#D4A017',
        text: {
          primary: '#F0EDE5',
          secondary: '#A09B8C',
          muted: '#5A5560',
        },
        // Legacy aliases (pre-restart token names) → mapped to Obsidian palette
        'muted-foreground': '#5A5560',
      },
      fontFamily: {
        display: ['var(--font-body)', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        lg: '2px',
        xl: '2px',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0,0,0,0.4)',
        elevated: '0 24px 64px rgba(0,0,0,0.5)',
        glow: '0 0 40px rgba(212,175,55,0.15)',
        'glow-strong': '0 0 60px rgba(212,175,55,0.25)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'pulse-dot': 'pulseDot 2000ms ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
    },
  },
  plugins: [],
};
