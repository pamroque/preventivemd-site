/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images from external sources (Unsplash, etc.)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // SVG-as-React-component imports.
  //
  // The brand mark in `public/assets/logo-{full,glyph}.svg` is the source of
  // truth for the wordmark + glyph. SVGR converts those files into React
  // components at build time, so designers update the .svg files and devs
  // never need to copy path data into JSX.
  //
  // `replaceAttrValues` swaps the baked brand colors to CSS custom properties
  // with brand defaults. This means:
  //   • Default render → brand colors (no overrides needed).
  //   • Inverse tone   → wrapper sets `--logo-blue` and `--logo-navy` to
  //                       `currentColor`, then `color: white` flips the whole
  //                       mark white. See src/components/ui/Logo.tsx.
  turbopack: {
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: false,
              replaceAttrValues: {
                '#3A5190': 'var(--logo-blue, #3A5190)',
                '#1D2D44': 'var(--logo-navy, #1D2D44)',
              },
            },
          },
        ],
        as: '*.js',
      },
    },
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: false,
            replaceAttrValues: {
              '#3A5190': 'var(--logo-blue, #3A5190)',
              '#1D2D44': 'var(--logo-navy, #1D2D44)',
            },
          },
        },
      ],
    })
    return config
  },
}

module.exports = nextConfig
