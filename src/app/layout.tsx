import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif, Lexend } from 'next/font/google'
import './globals.css'
import SiteNav from '@/components/layout/SiteNav'
import SkipLink from '@/components/a11y/SkipLink'
import RouteFocus from '@/components/a11y/RouteFocus'
import { AccessibilityProvider } from '@/components/a11y/AccessibilityContext'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
})

// Loaded for the "Enhanced Readability" a11y toggle. Only applied to body text
// when html[data-readability="enhanced"]; otherwise it's preloaded but unused.
const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
})

export const metadata: Metadata = {
  title: 'PreventiveMD',
  description: 'Medical intake for preventive care and peptide treatments.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSerif.variable} ${lexend.variable}`}
    >
      <body className={dmSans.className}>
        {/*
          SiteNav renders:
          - Desktop: fixed top navbar (h-14)
          - Mobile: fixed top header (h-12) + fixed bottom nav bar
          Children receive appropriate top/bottom padding via their own page layouts.
        */}
        <AccessibilityProvider>
          <SkipLink />
          <RouteFocus />
          <SiteNav />
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  )
}
