import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SiteNav from '@/components/layout/SiteNav'
import SkipLink from '@/components/a11y/SkipLink'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={inter.className}>
        {/*
          SiteNav renders:
          - Desktop: fixed top navbar (h-14)
          - Mobile: fixed top header (h-12) + fixed bottom nav bar
          Children receive appropriate top/bottom padding via their own page layouts.
        */}
        <SkipLink />
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
