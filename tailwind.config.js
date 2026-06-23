/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // ── 背景层（更深、更冷、更克制） ──
        bg: {
          DEFAULT: '#0a0c10',     // 主背景：墨蓝近黑
          soft:    '#101218',     // 输入框、二级表面
          card:    '#13161d',     // 卡片
          hover:   '#1a1e27',     // 卡片悬停
          elevate: '#1f242f',     // 浮层、菜单
        },
        // ── 描边 ──
        line: {
          DEFAULT: '#1e2230',
          soft:    '#171a23',
          strong:  '#2c3142',
        },
        // ── 文字 ──
        ink: {
          DEFAULT: '#e6e8ee',     // 主文字
          soft:    '#9ba2b5',     // 次文字
          muted:   '#5d6478',     // 注释、占位
          faint:   '#3a4055',     // 装饰
        },
        // ── 强调色：墨色蓝紫（比之前更克制） ──
        brand: {
          DEFAULT: '#7c5cff',     // 主色
          soft:    '#5d44d4',
          glow:    '#9b85ff',
          tint:    'rgba(124, 92, 255, 0.10)',
          tintHi:  'rgba(124, 92, 255, 0.18)',
          ring:    'rgba(124, 92, 255, 0.35)',
        },
        // ── 状态色（降饱和柔和版） ──
        success: '#4cc38a',
        warn:    '#e3b341',
        danger:  '#ed6a5e',
        info:    '#5b9cd6',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Inter"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // 强调按钮渐变（紫 → 蓝紫）
        'brand-gradient': 'linear-gradient(135deg, #7c5cff 0%, #5b71e3 100%)',
        // 卡片高光
        'card-shine': 'linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 60%)',
      },
      boxShadow: {
        // 轻 + 精致的多层投影
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px 0 rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(124, 92, 255, 0.4), 0 8px 24px -6px rgba(124, 92, 255, 0.45)',
        toast: '0 20px 50px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,92,255,0.18)',
        ring: '0 0 0 3px rgba(124, 92, 255, 0.25)',
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
