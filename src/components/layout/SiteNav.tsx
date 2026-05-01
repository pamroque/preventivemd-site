'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Logo from '@/components/ui/Logo'

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
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
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
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M15.5649 15.0212C15.9686 15.0212 16.2961 15.348 16.2963 15.7516V18.7341H19.2787C19.6824 18.7343 20.0092 19.0618 20.0092 19.4655C20.0092 19.8693 19.6824 20.1968 19.2787 20.197H16.2963V23.1794C16.2961 23.5831 15.9686 23.9099 15.5649 23.9099C15.1611 23.9098 14.8336 23.5831 14.8334 23.1794V20.197H11.851C11.4473 20.1967 11.1205 19.8692 11.1205 19.4655C11.1206 19.0618 11.4473 18.7343 11.851 18.7341H14.8334V15.7516C14.8336 15.348 15.1611 15.0212 15.5649 15.0212Z" fill="currentColor" stroke="currentColor" strokeWidth="0.2"/>
        <path d="M22.2015 1.2337C23.6684 1.23392 24.8616 2.42697 24.8616 3.89386V4.7962C24.8616 6.26309 23.6683 7.45615 22.2015 7.45636H21.3841V8.43097C21.6875 8.5693 22.0987 8.77006 22.5013 9.01105C22.929 9.26706 23.3559 9.57179 23.6322 9.89972L24.4818 10.9095C24.8814 11.384 25.2346 12.0455 25.4876 12.7386C25.7406 13.4317 25.8968 14.1652 25.8968 14.7855V28.1068C25.8966 29.5736 24.7025 30.7669 23.2357 30.7669H7.89388C6.42701 30.7669 5.23397 29.5736 5.23372 28.1068V14.7855C5.23372 14.1651 5.38989 13.4317 5.6429 12.7386C5.89589 12.0455 6.24819 11.384 6.64778 10.9095L7.49837 9.89972C7.77454 9.57198 8.20078 9.26694 8.62825 9.01105C9.03061 8.77021 9.44209 8.57027 9.74544 8.43195V7.45636H8.92903C7.46199 7.45636 6.2679 6.26322 6.2679 4.7962V3.89386C6.2679 2.42684 7.46202 1.2337 8.92903 1.2337H22.2015ZM11.2083 8.91046C11.2083 9.20917 11.0265 9.4779 10.7493 9.58917C10.4341 9.71576 9.98926 9.92186 9.57747 10.1517C9.16186 10.3836 8.79331 10.6322 8.61653 10.8421L7.76692 11.8519C7.48567 12.1858 7.2163 12.697 7.0179 13.2405C6.81951 13.7841 6.69563 14.3489 6.69563 14.7855V28.1068C6.69588 28.7669 7.23364 29.304 7.89388 29.304H23.2357C23.8959 29.304 24.4337 28.7669 24.4339 28.1068V14.7855C24.4339 14.3488 24.31 13.7841 24.1116 13.2405C23.9133 12.6972 23.6448 12.1858 23.3636 11.8519L22.513 10.8421C22.3362 10.6322 21.9677 10.3836 21.5521 10.1517C21.1403 9.92185 20.6956 9.7158 20.3802 9.58917C20.1033 9.47779 19.9212 9.20904 19.9212 8.91046V7.45636H11.2083V8.91046ZM19.8812 5.99445H20.8089V2.69562H19.8812V5.99445ZM10.3206 5.99445H11.2484V2.69562H10.3206V5.99445ZM17.4915 5.99445H18.4183V2.69562H17.4915V5.99445ZM15.1009 5.99445H16.0286V2.69562H15.1009V5.99445ZM12.7113 5.99445H13.639V2.69562H12.7113V5.99445ZM8.85872 2.69952C8.23078 2.73593 7.73079 3.25699 7.73079 3.89386V4.7962C7.73079 5.43307 8.23078 5.95414 8.85872 5.99054V2.69952ZM22.2708 5.99054C22.8989 5.95424 23.3988 5.43315 23.3988 4.7962V3.89386C23.3988 3.2569 22.8989 2.73482 22.2708 2.69855V5.99054Z" fill="currentColor" stroke="currentColor" strokeWidth="0.2"/>
      </svg>
    </span>
  )
}

function GetStartedIcon({ active }: { active: boolean }) {
  return (
    <span className={`size-8 flex items-center justify-center ${active ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
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
  // Treatments is now a section on the home page rather than a separate route,
  // so the link is an in-page anchor.
  { label: 'Treatments', href: '/#treatments' },
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
const VERIFY_PATH = '/sign-in/verify'

/**
 * Pages that suppress the entire SiteNav (top header + bottom mobile nav)
 * because they render their own minimal back-header chrome.
 */
function shouldHideAllChrome(pathname: string): boolean {
  if (pathname.startsWith('/get-started/questionnaire') && pathname !== DISQUALIFICATION_PATH) {
    return true
  }
  if (pathname === VERIFY_PATH) return true
  return false
}

/** Desktop navbar — shown on md+ screens */
function DesktopNav({
  pathname,
  hidden,
  treatmentsInView,
}: {
  pathname: string
  hidden: boolean
  treatmentsInView: boolean
}) {
  if (shouldHideAllChrome(pathname)) return null
  return (
    <header
      aria-hidden={hidden || undefined}
      // `inert` removes the nav and its descendants from the tab order +
      // accessibility tree while it's animated off-screen. Without this,
      // keyboard users tabbed through invisible nav links between the skip
      // link and the hero's logo. `pointer-events-none` only blocks mouse.
      inert={hidden || undefined}
      className={`hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-4 backdrop-blur-sm bg-white/90 border-b border-[#e3e3e3] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
        hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Leading */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" aria-label="PreventiveMD home" className="text-[#1d2d44]">
          <Logo className="h-[18px] w-auto" />
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-[#e4e4e7] mx-0" aria-hidden="true" />

        {/* Nav items */}
        <nav aria-label="Main navigation">
          <ul className="flex items-center gap-3" role="list">
            {NAV_ITEMS.map(({ label, href }) => {
              // Treatments activates on /treatments/* detail pages AND when the
              // home-page Treatments section is currently in view.
              const isActive =
                href === '/'
                  ? pathname === '/' && !treatmentsInView
                  : href === '/#treatments'
                    ? pathname.startsWith('/treatments') || (pathname === '/' && treatmentsInView)
                    : pathname.startsWith(href)
              return (
                <li key={href} className="flex flex-col items-center relative">
                  <Link
                    href={href}
                    className={`flex items-center justify-center px-2 py-2 rounded-lg text-sm font-medium leading-5 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-[#3A5190]'
                        : 'text-[#1d2d44] hover:text-[#3A5190]'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                  {isActive && (
                    <span
                      className="absolute -bottom-[10px] left-0 right-0 h-0.5 bg-[#3A5190] rounded-full"
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
        {(() => {
          const isSignInActive = pathname.startsWith('/sign-in')
          return (
            <Link
              href="/sign-in"
              aria-current={isSignInActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-[10px] py-[6px] rounded-lg border bg-white shadow-sm text-sm font-medium transition-colors ${
                isSignInActive
                  ? 'border-[#3A5190] text-[#3A5190]'
                  : 'border-[#e4e4e7] text-[#09090b] hover:bg-gray-50'
              }`}
            >
              <UserCircleIcon
                className={`size-4 ${isSignInActive ? 'text-[#3A5190]' : 'text-[#09090b]'}`}
              />
              Sign in
            </Link>
          )
        })()}
      </div>
    </header>
  )
}

/** Mobile top header — shown on <md screens, hidden during intake */
function MobileHeader({ pathname, hidden }: { pathname: string; hidden: boolean }) {
  if (shouldHideAllChrome(pathname)) return null
  return (
    <header
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`flex md:hidden fixed top-0 left-0 right-0 z-50 h-12 items-center justify-between px-4 py-2 backdrop-blur-sm bg-white/90 border-b border-[#e3e3e3] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
        hidden ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <Link href="/" aria-label="PreventiveMD home" className="flex items-center text-[#1d2d44]">
        <Logo className="h-[18px] w-auto" />
      </Link>
      <AccessibilityMenuButton />
    </header>
  )
}

/** Mobile bottom navigation bar — shown on <md screens */
function MobileBottomNav({
  pathname,
  hidden,
  treatmentsInView,
}: {
  pathname: string
  hidden: boolean
  treatmentsInView: boolean
}) {
  if (shouldHideAllChrome(pathname)) return null

  // Post-auth Care Portal pages get a distinct nav variant.
  if (pathname === '/journey') return <JourneyBottomNav pathname={pathname} />

  const isGetStarted = pathname.startsWith('/get-started')
  // Treatments activates on /treatments/* detail pages AND when the home-page
  // Treatments section is currently in view.
  const isTreatments =
    pathname.startsWith('/treatments') || (pathname === '/' && treatmentsInView)
  const isHome = pathname === '/' && !treatmentsInView
  // sign-in is not a "welcome" page but keep fallback
  const isSignIn = pathname.startsWith('/sign-in')

  return (
    <nav
      aria-label="Mobile navigation"
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`flex md:hidden fixed bottom-2 left-2 right-2 z-50 h-16 rounded-br-[36px] rounded-tl-[36px] border border-[#d1d1d1] overflow-hidden transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
        hidden ? 'pointer-events-none translate-y-[calc(100%+0.5rem)] opacity-0' : 'translate-y-0 opacity-100'
      }`}
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
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isHome ? 'page' : undefined}
        >
          <WelcomeIcon active={isHome} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isHome ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Welcome
          </span>
        </Link>

        {/* Treatments — custom pill bottle SVG export */}
        <Link
          href="/#treatments"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isTreatments ? 'page' : undefined}
        >
          <TreatmentsIcon active={isTreatments} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isTreatments ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Treatments
          </span>
        </Link>

        {/* Get started — clipboard + "+" badge (inline SVG composite) */}
        <Link
          href="/get-started"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isGetStarted ? 'page' : undefined}
        >
          <GetStartedIcon active={isGetStarted} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isGetStarted ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Get started
          </span>
        </Link>

        {/* Sign in — heroicons-outline/user-circle */}
        <Link
          href="/sign-in"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isSignIn ? 'page' : undefined}
        >
          <UserCircleIcon className={`size-8 ${isSignIn ? 'text-[#3A5190]' : 'text-[#71717a]'}`} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isSignIn ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Sign in
          </span>
        </Link>
      </div>
    </nav>
  )
}

/** Chat-bubble + "+" — Support tab on the post-auth Journey nav.
 *  Sourced from /public/assets/icon-support.svg, inlined so it can inherit
 *  active/inactive color via currentColor. */
function ChatSupportIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      className={`size-8 ${active ? 'text-[#3A5190]' : 'text-[#71717a]'}`}
      aria-hidden="true"
    >
      <path
        d="M3 17.0125C3 19.1472 4.49788 21.0054 6.60995 21.3159C8.05809 21.5289 9.52201 21.6933 11 21.8075V28L16.578 22.422C16.8536 22.1464 17.2258 21.9897 17.6155 21.98C20.2496 21.9148 22.8441 21.6904 25.39 21.3161C27.5021 21.0056 29 19.1474 29 17.0126V8.98741C29 6.85261 27.5021 4.99444 25.39 4.68391C22.3254 4.23335 19.1901 4 16.0004 4C12.8103 4 9.67482 4.23339 6.60996 4.68403C4.49789 4.99458 3 6.85275 3 8.98752V17.0125Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.8 8.8C16.8 8.35817 16.4418 8 16 8C15.5582 8 15.2 8.35817 15.2 8.8V12.5333H11.4667C11.0248 12.5333 10.6667 12.8915 10.6667 13.3333C10.6667 13.7752 11.0248 14.1333 11.4667 14.1333L15.2 14.1333V17.8667C15.2 18.3085 15.5582 18.6667 16 18.6667C16.4418 18.6667 16.8 18.3085 16.8 17.8667V14.1333L20.5333 14.1333C20.9752 14.1333 21.3333 13.7752 21.3333 13.3333C21.3333 12.8915 20.9752 12.5333 20.5333 12.5333H16.8V8.8Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Bottom navigation for post-auth Care Portal pages: Journey / Treatments /
 * Support / <user avatar>. Mirrors the pre-auth MobileBottomNav layout but
 * with different items.
 */
function JourneyBottomNav({ pathname }: { pathname: string }) {
  const isJourney = pathname === '/journey'
  const isTreatments = pathname.startsWith('/treatments')
  const isSupport = pathname === '/support'
  const isProfile = pathname === '/profile'

  // Placeholder initials — will come from the authenticated session later.
  const initials = 'JD'

  return (
    <nav
      aria-label="Care portal navigation"
      className="flex md:hidden fixed bottom-2 left-2 right-2 z-50 h-16 rounded-br-[36px] rounded-tl-[36px] border border-[#d1d1d1] overflow-hidden"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(255,255,255,0.72) 30%, rgba(255,255,255,0.8) 70%, rgba(255,255,255,0.8) 100%)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div className="flex flex-1 items-stretch">
        <Link
          href="/journey"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isJourney ? 'page' : undefined}
        >
          <WelcomeIcon active={isJourney} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isJourney ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Journey
          </span>
        </Link>

        <Link
          href="/#treatments"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isTreatments ? 'page' : undefined}
        >
          <TreatmentsIcon active={isTreatments} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isTreatments ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Treatments
          </span>
        </Link>

        <Link
          href="/support"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isSupport ? 'page' : undefined}
        >
          <ChatSupportIcon active={isSupport} />
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isSupport ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Support
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
          aria-current={isProfile ? 'page' : undefined}
        >
          <span
            className={`size-8 flex items-center justify-center ${isProfile ? 'text-[#3A5190]' : 'text-[#71717a]'}`}
            aria-hidden="true"
          >
            <span className="size-6 rounded-full bg-[#71717a] text-white text-xs font-normal leading-4 flex items-center justify-center">
              {initials}
            </span>
          </span>
          <span className={`text-xs font-medium leading-4 text-center whitespace-nowrap ${isProfile ? 'text-[#3A5190]' : 'text-[#71717a]'}`}>
            Jane
          </span>
        </Link>
      </div>
    </nav>
  )
}

/**
 * On the home page, the hero carries its own embedded logo + accessibility
 * utility, so the fixed nav stays hidden until the user scrolls past the
 * hero. Once the hero is fully out of view, the nav fades in over the
 * quick-start tiles and everything below. Other routes show the nav
 * immediately.
 */
function useHeroBlocksNav(pathname: string): boolean {
  const onHome = pathname === '/'
  const [blocked, setBlocked] = useState(onHome)

  useEffect(() => {
    if (!onHome) {
      setBlocked(false)
      return
    }
    setBlocked(true)
    const heroEl = document.getElementById('home-hero')
    if (!heroEl) return

    const observer = new IntersectionObserver(
      ([entry]) => setBlocked(entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(heroEl)
    return () => observer.disconnect()
  }, [onHome])

  return blocked
}

/**
 * On the home page, observe the `#treatments` section so the nav can switch
 * the active tab from Welcome to Treatments while the user is reading that
 * section. The rootMargin defines a thin band near the top of the viewport
 * (~30%-40% from the top); the section is "in focus" while it overlaps it.
 */
function useTreatmentsInView(pathname: string): boolean {
  const onHome = pathname === '/'
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!onHome) {
      setInView(false)
      return
    }
    const el = document.getElementById('treatments')
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '-30% 0px -60% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onHome])

  return inView
}

/** Root navigation — renders both desktop and mobile layers */
export default function SiteNav() {
  const pathname = usePathname()
  const hidden = useHeroBlocksNav(pathname)
  const treatmentsInView = useTreatmentsInView(pathname)
  return (
    <>
      <DesktopNav pathname={pathname} hidden={hidden} treatmentsInView={treatmentsInView} />
      <MobileHeader pathname={pathname} hidden={hidden} />
      <MobileBottomNav pathname={pathname} hidden={hidden} treatmentsInView={treatmentsInView} />
    </>
  )
}
