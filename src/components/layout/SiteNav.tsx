'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ─── Inline SVG icons ────────────────────────────────────────────────────────

/** heroicons-outline/globe-alt — Language & Accessibility button */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className ?? 'size-6'} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}

/** heroicons-outline/user-circle — Sign in (desktop button + mobile nav) */
function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={className ?? 'size-6'} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function WelcomeIcon({ active }: { active: boolean }) {
  return (
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g clipPath="url(#clip0_welcome)">
          <path d="M31.9889 9.80974C32.1196 14.2794 31.1344 19.3061 26.99 22.0504C25.2468 23.0789 23.0877 23.0972 21.3037 22.5104C20.003 22.0927 18.8128 21.4428 17.7659 20.586C17.9307 20.3754 18.0958 20.1647 18.2606 19.9541C19.2572 20.6624 20.4164 21.1982 21.5922 21.4938C23.2265 21.9136 24.9528 21.7636 26.2843 20.8817C29.2245 18.7922 30.2293 14.5757 30.1402 10.8479C25.0636 11.117 21.3769 14.3102 17.9229 18.3229C17.7251 18.531 17.535 18.7295 17.3341 18.9369C14.9267 21.414 11.8259 23.3699 8.27489 23.9433C6.51468 24.2099 4.592 24.14 2.85364 23.2375C1.08282 22.3857 -0.0976532 20.2861 0.0100256 18.3816C-0.217242 14.7169 3.46102 11.8396 6.80853 11.9166C8.68972 11.9543 10.3805 12.7887 11.7855 13.7955C12.8697 14.5759 13.8348 15.4949 14.7137 16.4659C14.5215 16.6519 14.3291 16.8379 14.1369 17.024C13.2232 16.1447 12.2429 15.3304 11.1949 14.6719C9.83273 13.8156 8.30851 13.2067 6.80853 13.2641C4.03689 13.4614 1.5239 15.5656 1.77282 18.3816C1.68748 21.3314 5.05403 22.5437 7.94467 21.9322C10.9046 21.4017 13.6469 19.6748 15.7968 17.4487C15.9919 17.2469 16.1773 17.0531 16.371 16.8491C18.2513 14.9043 20.0526 12.6788 22.6052 11.0842C25.1577 9.47365 28.1979 8.97606 31.0136 8.93572L31.9326 8.92035L31.9889 9.80974Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_welcome">
            <rect width="32" height="32" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    </span>
  )
}

function TreatmentsIcon({ active }: { active: boolean }) {
  return (
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22.3903 8.50873H10.1496C8.22911 8.50873 6.66667 10.0712 6.66667 11.9906V27.1848C6.66667 29.1052 8.22911 30.6667 10.1496 30.6667H22.3893C24.3098 30.6667 25.8722 29.1052 25.8722 27.1848V11.9906C25.8722 10.0712 24.3108 8.50873 22.3903 8.50873ZM10.1496 10.4081H22.3893C23.2618 10.4081 23.9718 11.1191 23.9718 11.9906V12.835H8.56707V11.9906C8.56707 11.1191 9.27708 10.4081 10.1496 10.4081ZM11.4242 20.9982V18.4409H14.9933V14.8748H17.5496V18.4409H21.1157V20.9982H17.5496V24.5653H14.9933V20.9982H11.4242ZM22.3903 28.7673H10.1496C9.27708 28.7673 8.56707 28.0572 8.56707 27.1848V26.6041H23.9718V27.1848C23.9728 28.0572 23.2628 28.7673 22.3903 28.7673Z" fill="currentColor"/>
        <path d="M11.2958 7.66429H21.244C22.0443 7.66429 22.6911 7.01645 22.6911 6.21818V2.78042C22.6911 1.98115 22.0433 1.33331 21.244 1.33331H11.2958C10.4955 1.33331 9.84866 1.98115 9.84866 2.78042V6.21818C9.84866 7.01745 10.4955 7.66429 11.2958 7.66429ZM19.7969 3.00707H20.883V5.99154H19.7969V3.00707ZM17.0842 3.00707H18.1693V5.99154H17.0842V3.00707ZM14.3705 3.00707H15.4556V5.99154H14.3705V3.00707ZM11.6568 3.00707H12.7419V5.99154H11.6568V3.00707Z" fill="currentColor"/>
      </svg>
    </span>
  )
}

function GetStartedIcon({ active }: { active: boolean }) {
  return (
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g clipPath="url(#clip0_getstarted)">
          <path d="M20.8876 5.18385C20.5322 3.92363 19.3739 3 18 3H14C12.6261 3 11.4678 3.92363 11.1124 5.18385M20.8876 5.18385C20.9608 5.44334 21 5.7171 21 6C21 6.55228 20.5523 7 20 7H12C11.4477 7 11 6.55228 11 6C11 5.7171 11.0392 5.44334 11.1124 5.18385M20.8876 5.18385C21.7492 5.24891 22.606 5.33103 23.4578 5.42988C24.9252 5.60018 26 6.86533 26 8.34265V26C26 27.6569 24.6569 29 23 29H9C7.34315 29 6 27.6569 6 26V8.34265C6 6.86533 7.07477 5.60018 8.54224 5.42988C9.39396 5.33103 10.2508 5.24891 11.1124 5.18385" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16.8 12.8C16.8 12.3582 16.4418 12 16 12C15.5581 12 15.2 12.3582 15.2 12.8V16.5333H11.4666C11.0248 16.5333 10.6666 16.8915 10.6666 17.3333C10.6666 17.7752 11.0248 18.1333 11.4666 18.1333L15.2 18.1333V21.8667C15.2 22.3085 15.5581 22.6667 16 22.6667C16.4418 22.6667 16.8 22.3085 16.8 21.8667V18.1333L20.5333 18.1333C20.9751 18.1333 21.3333 17.7752 21.3333 17.3333C21.3333 16.8915 20.9751 16.5333 20.5333 16.5333H16.8V12.8Z" fill="currentColor"/>
        </g>
        <defs>
          <clipPath id="clip0_getstarted">
            <rect width="32" height="32" fill="white"/>
          </clipPath>
        </defs>
      </svg>
    </span>
  )
}

interface NavItem {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Welcome', href: '/' },
  { label: 'Treatments', href: '/treatments' },
  { label: 'Get started', href: '/get-started' },
]

function AccessibilityMenuButton() {
  return (
    <button
      type="button"
      className="flex items-center gap-1 text-[#1d2d44] hover:opacity-75 transition-opacity"
      aria-label="Language and Accessibility settings"
    >
      <GlobeIcon className="size-6 shrink-0" />
      <span className="text-[10px] font-medium leading-[1.4] whitespace-nowrap text-left">
        Language &amp;
        <br />
        Accessibility
      </span>
    </button>
  )
}

const DISQUALIFICATION_PATH = '/get-started/questionnaire/disqualification'

/** Desktop navbar — shown on md+ screens */
function DesktopNav({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/get-started/questionnaire') && pathname !== DISQUALIFICATION_PATH) return null
  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-4 backdrop-blur-sm bg-white/90 border-b border-[#e3e3e3]">
      {/* Leading */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" aria-label="PreventiveMD home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-full.svg"
            alt="PreventiveMD"
            width={194}
            height={28}
          />
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-[#e4e4e7] mx-0" aria-hidden="true" />

        {/* Nav items */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-3" role="list">
            {NAV_ITEMS.map(({ label, href }) => {
              const isActive = href === '/'
                ? pathname === '/'
                : pathname.startsWith(href)
              return (
                <li key={href} className="flex flex-col items-center relative">
                  <Link
                    href={href}
                    className={`flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium leading-5 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-[#0778ba]'
                        : 'text-[#1d2d44] hover:text-[#0778ba]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                  {isActive && (
                    <span
                      className="absolute -bottom-[10px] left-0 right-0 h-0.5 bg-[#0778ba] rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Trailing */}
      <div className="flex items-center gap-6">
        <AccessibilityMenuButton />
        <Link
          href="/sign-in"
          className="flex items-center gap-2 px-[10px] py-[6px] rounded-lg border border-[#e4e4e7] bg-white shadow-sm text-sm font-medium text-[#09090b] hover:bg-gray-50 transition-colors"
        >
          <UserCircleIcon className="size-4 text-[#09090b]" />
          Sign in
        </Link>
      </div>
    </header>
  )
}

/** Mobile top header — shown on <md screens, hidden during intake */
function MobileHeader({ pathname }: { pathname: string }) {
  if (pathname.startsWith('/get-started/questionnaire') && pathname !== DISQUALIFICATION_PATH) return null
  return (
    <header className="flex md:hidden fixed top-0 left-0 right-0 z-50 h-12 items-center justify-between px-4 py-2 backdrop-blur-sm bg-white/90 border-b border-[#e3e3e3]">
      <Link href="/" aria-label="PreventiveMD home" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo-full.svg"
          alt="PreventiveMD"
          width={166}
          height={24}
        />
      </Link>
      <AccessibilityMenuButton />
    </header>
  )
}

/** Mobile bottom navigation bar — shown on <md screens */
function MobileBottomNav({ pathname }: { pathname: string }) {
  const isGetStarted = pathname.startsWith('/get-started')
  const isTreatments = pathname.startsWith('/treatments')
  const isHome = pathname === '/'
  // sign-in is not a "welcome" page but keep fallback
  const isSignIn = pathname.startsWith('/sign-in')

  // Hide during intake questionnaire flow (except disqualification, which uses the full site nav)
  if (pathname.startsWith('/get-started/questionnaire') && pathname !== DISQUALIFICATION_PATH) return null

  return (
    <nav
      aria-label="Mobile navigation"
      className="flex md:hidden fixed bottom-2 left-2 right-2 z-50 h-16 rounded-br-[36px] rounded-tl-[36px] border border-[#d1d1d1] overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.9) 29.69%, rgb(255,255,255) 69.53%, rgb(255,255,255) 100%)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="flex flex-1 items-stretch">
        {/* Welcome — logomark SVG export */}
        <Link
          href="/"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
          aria-current={isHome ? 'page' : undefined}
        >
          <WelcomeIcon active={isHome} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isHome ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
            Welcome
          </span>
        </Link>

        {/* Treatments — custom pill bottle SVG export */}
        <Link
          href="/treatments"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
          aria-current={isTreatments ? 'page' : undefined}
        >
          <TreatmentsIcon active={isTreatments} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isTreatments ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
            Treatments
          </span>
        </Link>

        {/* Get started — clipboard + "+" badge (inline SVG composite) */}
        <Link
          href="/get-started"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
          aria-current={isGetStarted ? 'page' : undefined}
        >
          <GetStartedIcon active={isGetStarted} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isGetStarted ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
            Get started
          </span>
        </Link>

        {/* Sign in — heroicons-outline/user-circle */}
        <Link
          href="/sign-in"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0778ba]"
          aria-current={isSignIn ? 'page' : undefined}
        >
          <UserCircleIcon className={`size-8 ${isSignIn ? 'text-[#0778ba]' : 'text-[#71717a]'}`} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isSignIn ? 'text-[#0778ba]' : 'text-[#71717a]'}`}>
            Sign in
          </span>
        </Link>
      </div>
    </nav>
  )
}

/** Root navigation — renders both desktop and mobile layers */
export default function SiteNav() {
  const pathname = usePathname()
  return (
    <>
      <DesktopNav pathname={pathname} />
      <MobileHeader pathname={pathname} />
      <MobileBottomNav pathname={pathname} />
    </>
  )
}
