/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme palette
        dark: {
          900: '#0a0e1a',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
          400: '#64748b',
          300: '#94a3b8',
          200: '#cbd5e1',
          100: '#e2e8f0',
        },
        // Electric accent colors
        electric: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          violet: '#8b5cf6',
          pink: '#ec4899',
          green: '#22c55e',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'slide-left': 'slide-left 0.3s ease-out',
        'slide-right': 'slide-right 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'cursor-blink': 'cursor-blink 1s ease-in-out infinite',
        'scale-in': 'scale-in 0.2s ease-out',
        'bounce-subtle': 'bounce-subtle 0.5s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'shimmer': 'shimmer 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'stagger-in': 'stagger-in 0.4s ease-out both',
        'shake': 'shake 0.4s ease-in-out',
        'slide-up-sheet': 'slide-up-sheet 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down-sheet': 'slide-down-sheet 0.25s ease-in',
        'expand-width': 'expand-width 0.3s ease-out',
        'collapse-width': 'collapse-width 0.3s ease-in',
        'trace-flow': 'trace-flow 4s linear infinite',
        'typing': 'typing 3s steps(40) 1s both, blink-caret 0.75s step-end infinite',
        'count-up': 'count-up 0.6s ease-out',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'glow-border': 'glow-border 1.5s ease-in-out infinite',
        'wire-flow': 'wire-flow 1.5s linear infinite',
        'spark': 'spark 0.6s ease-out forwards',
        'float-icon': 'float-icon 6s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.2)' },
          '50%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-left': {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-right': {
          from: { transform: 'translateX(-20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'scale-in': {
          from: { transform: 'scale(0.9)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        'bounce-subtle': {
          '0%': { transform: 'scale(0.95)' },
          '40%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' },
        },
        'ripple': {
          from: { transform: 'scale(0)', opacity: '0.5' },
          to: { transform: 'scale(2.5)', opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(6, 182, 212, 0.3)' },
          '50%': { boxShadow: '0 0 12px rgba(6, 182, 212, 0.6), 0 0 24px rgba(6, 182, 212, 0.2)' },
        },
        'stagger-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '50%': { transform: 'translateX(4px)' },
          '75%': { transform: 'translateX(-2px)' },
        },
        'slide-up-sheet': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-down-sheet': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'expand-width': {
          from: { width: '3.5rem', opacity: '0.8' },
          to: { width: '14rem', opacity: '1' },
        },
        'collapse-width': {
          from: { width: '14rem', opacity: '1' },
          to: { width: '3.5rem', opacity: '0.8' },
        },
        'trace-flow': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        'typing': {
          from: { width: '0' },
          to: { width: '100%' },
        },
        'blink-caret': {
          'from, to': { borderColor: 'transparent' },
          '50%': { borderColor: '#3b82f6' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow-border': {
          '0%, 100%': { borderColor: 'rgba(6, 182, 212, 0.3)' },
          '50%': { borderColor: 'rgba(6, 182, 212, 0.7)' },
        },
        'wire-flow': {
          from: { strokeDashoffset: '20' },
          to: { strokeDashoffset: '0' },
        },
        'spark': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '0.8' },
          '100%': { transform: 'scale(0) rotate(360deg)', opacity: '0' },
        },
        'float-icon': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(10px, -15px) rotate(5deg)' },
          '50%': { transform: 'translate(-5px, -25px) rotate(-3deg)' },
          '75%': { transform: 'translate(-15px, -10px) rotate(3deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
};
