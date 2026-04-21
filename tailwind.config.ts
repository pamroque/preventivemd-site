import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // PreventiveMD brand tokens — matches your current CSS variables
      colors: {
        navy: '#1d2d44',
        blue: {
          brand: '#0071bc',
        },
        teal: {
          brand: '#00b4c8',
        },
        border: '#e0edf4',
        muted: '#6b8899',
        bg: '#f7fbfd',
      },
      fontFamily: {
        // System font stack matching your current site
        sans: ['-apple-system', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Reusable gradient matching your brand
        'brand-gradient': 'linear-gradient(135deg, #0071bc, #00b4c8)',
        'brand-gradient-90': 'linear-gradient(90deg, #0071bc, #00b4c8)',
      },
    },
  },
  plugins: [],
}

export default config
