import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import './globals.css'
import SiteNav from '@/components/layout/SiteNav'
import SkipLink from '@/components/a11y/SkipLink'
import RouteFocus from '@/components/a11y/RouteFocus'

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
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <body className={dmSans.className}>
        {/*
          SiteNav renders:
          - Desktop: fixed top navbar (h-14)
          - Mobile: fixed top header (h-12) + fixed bottom nav bar
          Children receive appropriate top/bottom padding via their own page layouts.
        */}
        <SkipLink />
        <RouteFocus />
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
