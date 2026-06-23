/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0f1115', soft: '#151821', card: '#1c2030', hover: '#232838' },
        line: { DEFAULT: '#2a3045', soft: '#1f2433', strong: '#3a4258' },
        ink: { DEFAULT: '#e7eaf3', soft: '#a8aec0', muted: '#6b7186', faint: '#4a5066' },
        brand: {
          DEFAULT: '#8b7cff',
          soft: '#5a4fc4',
          glow: '#a597ff',
          tint: 'rgba(139, 124, 255, 0.12)',
          tintHi: 'rgba(139, 124, 255, 0.22)',
        },
        success: '#4ade80',
        warn: '#fbbf24',
        danger: '#f87171',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Inter"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #8b7cff 0%, #6366f1 100%)',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 24px -8px rgba(0,0,0,0.4)',
        glow: '0 8px 32px -8px rgba(139, 124, 255, 0.4)',
        toast: '0 16px 48px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,124,255,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toastIn 350ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        toastIn: { '0%': { opacity: '0', transform: 'translateY(24px) scale(0.94)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
      },
    },
  },
  plugins: [],
}
