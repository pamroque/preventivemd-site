import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // PreventiveMD brand tokens — Preventive Blue / Turquoise
      colors: {
        navy: '#1d2d44',
        blue: {
          brand: '#3A5190',
        },
        // Legacy alias — kept so existing utilities keep compiling.
        teal: {
          brand: '#A2D5BC',
        },
        turquoise: {
          brand: '#A2D5BC',
        },
        border: '#e0edf4',
        muted: '#6b8899',
        bg: '#f7fbfd',
      },
      fontFamily: {
        // System font stack matching your current site
        sans: ['-apple-system', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
        // DM Sans + Instrument Serif loaded in layout.tsx
        'dm-sans': ['var(--font-dm-sans)', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'serif'],
      },
      backgroundImage: {
        // Reusable gradient matching your brand (blue → turquoise)
        'brand-gradient': 'linear-gradient(135deg, #3A5190, #A2D5BC)',
        'brand-gradient-90': 'linear-gradient(90deg, #3A5190, #A2D5BC)',
      },
    },
  },
  plugins: [],
}

export default config
