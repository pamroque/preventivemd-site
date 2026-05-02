/**
 * WCAG 2.2 SC 2.4.1 "Bypass Blocks" — lets keyboard users skip past the
 * site navigation and jump straight to the page's main content region.
 *
 * Mounted once in the root layout and rendered on every route. Every page
 * is expected to provide a `<main id="main-content" tabIndex={-1}>` landmark
 * so this link has somewhere to land. New pages MUST follow that contract.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="
        sr-only
        focus:not-sr-only
        focus:fixed focus:top-4 focus:left-4 focus:z-[100]
        focus:inline-flex focus:items-center
        focus:px-4 focus:py-2
        focus:rounded-md focus:bg-brand-blue focus:text-white
        focus:text-sm focus:font-medium focus:leading-5
        focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3b82f6]
      "
    >
      Skip to main content
    </a>
  )
}
