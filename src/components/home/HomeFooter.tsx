import Link from 'next/link'
import Logo from '@/components/ui/Logo'

type FooterLink = { label: string; href: string }

type FooterColumn = {
  heading: string
  links: FooterLink[]
}

const COLUMNS: FooterColumn[] = [
  {
    heading: 'Your care journey',
    links: [
      { label: 'Welcome', href: '/' },
      { label: 'Treatments', href: '/#treatments' },
      { label: 'Get started', href: '/get-started' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Site map', href: '#' },
    ],
  },
  {
    heading: 'Your privacy & rights',
    links: [
      { label: 'Terms of Use', href: '#' },
      { label: 'Subscription, Cancellation & Refund Policy', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Consumer Health Data Privacy Policy', href: '#' },
      { label: 'Cookie Policy', href: '#' },
    ],
  },
]

export default function HomeFooter() {
  return (
    <footer className="overflow-hidden rounded-bl-[48px] rounded-tr-[48px] bg-gradient-to-t from-[#1d2d44] to-[#071024] px-6 py-9 text-white md:rounded-bl-[72px] md:rounded-tr-[72px] md:px-12 md:pb-12 md:pt-9">
      <div className="flex flex-col gap-6">
        {/* Columns */}
        <div className="flex flex-col gap-9 md:flex-row md:items-start md:gap-12">
          {/* Contact (with logo) */}
          <div className="flex flex-1 flex-col gap-9 md:gap-9">
            <Link href="/" aria-label="PreventiveMD home" className="inline-block text-white">
              <Logo tone="inverse" className="h-6 w-auto" />
            </Link>
            <div className="flex flex-col gap-3">
              <h3 className="font-serif italic text-[20px] leading-6 text-[#a1a1aa]">Contact us</h3>
              <a
                href="tel:+19876543210"
                className="text-[14px] leading-5 underline decoration-solid"
              >
                +1 (987) 654-3210
              </a>
              <a
                href="mailto:hello@preventivemd.com"
                className="text-[14px] leading-5 underline decoration-solid"
              >
                hello@preventivemd.com
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="font-serif italic text-[20px] leading-6 text-[#a1a1aa]">{col.heading}</h3>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[14px] leading-5 underline decoration-solid"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          {/* Accessibility */}
          <div className="flex flex-col gap-3 md:max-w-[240px]">
            <h3 className="font-serif italic text-[20px] leading-6 text-[#a1a1aa]">
              Our commitment to making care accessible to everyone
            </h3>
            <Link
              href="#"
              className="text-[14px] leading-5 underline decoration-solid"
            >
              Accessibility Statement
            </Link>
          </div>
        </div>

        <div className="h-px w-full bg-white/20" />

        <div className="flex flex-col gap-2.5 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <p className="text-[14px] leading-5 text-white">
            © {new Date().getFullYear()} PreventiveMD. All rights reserved.
          </p>
          <p className="text-[14px] leading-5 text-white">
            This site is intended for U.S. residents only.
          </p>
        </div>
      </div>
    </footer>
  )
}
