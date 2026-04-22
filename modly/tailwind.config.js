/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f4f4f5',
          100: '#e4e4e7',
          200: '#27272a',
          300: '#1e1e21',
          400: '#111113',
          500: '#09090b',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light:   '#a78bfa',
          dark:    '#5b21b6',
          blue:    '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-accent':       'linear-gradient(135deg, #7c3aed, #3b82f6)',
        'gradient-accent-v':     'linear-gradient(180deg, #7c3aed, #3b82f6)',
        'gradient-radial-glow':  'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 65%)',
        'gradient-card-glow':    'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.08) 0%, transparent 70%)',
        shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      keyframes: {
        slide: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', filter: 'blur(8px)' },
          '50%':      { opacity: '0.8', filter: 'blur(12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        slide:       'slide 1.5s ease-in-out infinite',
        'glow-pulse':'glow-pulse 3s ease-in-out infinite',
        shimmer:     'shimmer 2.5s linear infinite',
        'fade-up':   'fade-up 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in':  'scale-in 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      boxShadow: {
        'glow-sm': '0 0 12px rgba(124,58,237,0.2)',
        'glow':    '0 0 28px rgba(124,58,237,0.3)',
        'glow-lg': '0 0 56px rgba(124,58,237,0.4)',
        'glass':   '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card':    '0 4px 24px rgba(0,0,0,0.4)',
      },
    }
  },
  plugins: []
}
