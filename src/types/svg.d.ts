// Tells TypeScript that `.svg` imports resolve to React components.
// Wired up at build time by SVGR (see next.config.js).
declare module '*.svg' {
  import type { FC, SVGProps } from 'react'
  const Component: FC<SVGProps<SVGSVGElement> & { title?: string }>
  export default Component
}
