import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Brand color tokens. Use these (e.g. `text-brand-blue`,
      // `bg-brand-navy`) instead of writing the hex via Tailwind arbitrary
      // values like `bg-[var(--brand-blue)]`. `brand-*` is intentionally generic so
      // the tokens survive a future rebrand without a codemod.
      colors: {
        // The `rgb(var(--…-rgb) / <alpha-value>)` form lets Tailwind's
        // opacity modifiers (`bg-brand-blue/20`, `border-brand-mint/30`,
        // etc.) decompose the color into channels. The matching
        // `--brand-*-rgb` channel-list vars live in `globals.css :root`.
        brand: {
          blue:  'rgb(var(--brand-blue-rgb) / <alpha-value>)',
          navy:  'rgb(var(--brand-navy-rgb) / <alpha-value>)',
          teal:  'rgb(var(--brand-teal-rgb) / <alpha-value>)',
          mint:  'rgb(var(--brand-mint-rgb) / <alpha-value>)',
          cream: 'rgb(var(--brand-cream-rgb) / <alpha-value>)',
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
        'brand-gradient': 'linear-gradient(135deg, var(--brand-blue), var(--brand-mint))',
        'brand-gradient-90': 'linear-gradient(90deg, var(--brand-blue), var(--brand-mint))',
      },
    },
  },
  plugins: [],
}

export default config
