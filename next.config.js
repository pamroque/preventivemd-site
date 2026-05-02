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
  // `replaceAttrValues` swaps the baked brand-color hexes (verbatim from the
  // Figma export) for `var(--brand-blue)` / `var(--brand-navy)`. Defaults
  // come from globals.css `:root`. To recolor the mark on a dark background,
  // the Logo wrapper sets `--brand-*` to `currentColor` on its scope only,
  // so a parent `text-white` flips the entire glyph white without disturbing
  // anyone else's brand vars. See src/components/ui/Logo.tsx.
  turbopack: {
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgo: false,
              replaceAttrValues: {
                '#3A5190': 'var(--brand-blue)',
                '#1D2D44': 'var(--brand-navy)',
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
              '#3A5190': 'var(--brand-blue)',
              '#1D2D44': 'var(--brand-navy)',
            },
          },
        },
      ],
    })
    return config
  },
}

module.exports = nextConfig
