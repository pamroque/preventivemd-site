import Link from 'next/link'

/*
 * Footer.tsx — Site footer
 *
 * KEY CONCEPT: This is a Server Component (no 'use client').
 * It has no interactivity — just static HTML. Next.js renders it
 * on the server and sends pure HTML to the browser. Zero JS shipped
 * for this component. Performance win.
 */

export function Footer() {
  return (
    <footer className="bg-navy text-white/50 text-center text-xs font-light py-10 px-6 leading-relaxed">
      <p>
        All peptides require a valid physician consultation and prescription.
        Pricing reflects compounded medication costs and may vary.
      </p>
      <p className="mt-1">
        PreventiveMD does not dispense medications directly — prescriptions are
        filled through licensed 503A/503B compounding pharmacies.
      </p>
      <p className="mt-4 text-white/30">
        &copy; {new Date().getFullYear()} PreventiveMD. All rights reserved.
        {' | '}
        <Link href="/terms" className="text-white/30 hover:text-white/60 transition-colors">
          Terms
        </Link>
        {' | '}
        <Link href="/privacy" className="text-white/30 hover:text-white/60 transition-colors">
          Privacy
        </Link>
      </p>
    </footer>
  )
}
