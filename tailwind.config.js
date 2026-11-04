/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        cyber: {
          bg: '#030712',
          panel: 'rgba(13, 20, 36, 0.75)',
          panel2: '#0d1424',
          border: '#1e293b',
          grid: '#0f1828',
        },
        neon: {
          cyan: '#06b6d4',
          blue: '#0ea5e9',
          magenta: '#ec4899',
          pink: '#f472b6',
          lime: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 25px rgba(6,182,212,0.08), 0 0 50px rgba(6,182,212,0.04)',
        'neon-magenta': '0 0 25px rgba(236,72,153,0.08), 0 0 50px rgba(236,72,153,0.04)',
        'neon-soft': '0 0 12px rgba(6,182,212,0.15)',
        'panel': '0 0 25px rgba(6,182,212,0.08)',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(6,182,212,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(6,182,212,0.6)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        gridMove: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '24px 24px' },
        },
      },
      animation: {
        scanline: 'scanline 4s linear infinite',
        flicker: 'flicker 3s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        slideUp: 'slideUp 0.4s ease-out',
        gridMove: 'gridMove 8s linear infinite',
      },
    },
  },
  plugins: [],
};
