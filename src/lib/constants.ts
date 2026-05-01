/*
 * constants.ts — Single source of truth for site-wide data
 *
 * KEY CONCEPT: In your HTML site, this data was scattered across
 * multiple files (nav dropdowns, treatment cards, etc.). In Next.js,
 * we centralize it here so when you add a new peptide, you update
 * ONE file and every component picks it up automatically.
 */

export type Treatment = {
  slug: string
  name: string
  shortName: string       // 3-letter code for vial icon
  category: 'metabolic' | 'energy' | 'healing'
  tagline: string
  price: string
  priceUnit: string
  iconBg: string          // Background color for vial icon
  iconFill: string        // Fill color for vial text
  hasDetailPage: boolean  // Some treatments don't have full pages yet
}

export const treatments: Treatment[] = [
  // ── METABOLIC HEALTH ──
  {
    slug: 'semaglutide',
    name: 'Semaglutide',
    shortName: 'SEM',
    category: 'metabolic',
    tagline: 'GLP-1 appetite suppression',
    price: '$150',
    priceUnit: '/mo',
    iconBg: '#e8f5f0',
    iconFill: '#3A5190',
    hasDetailPage: true,
  },
  {
    slug: 'tirzepatide',
    name: 'Tirzepatide',
    shortName: 'TIR',
    category: 'metabolic',
    tagline: 'Dual GLP-1 + GIP receptor agonist',
    price: '$200',
    priceUnit: '/mo',
    iconBg: '#e8f5f0',
    iconFill: '#3A5190',
    hasDetailPage: true,
  },
  {
    slug: 'tesamorelin',
    name: 'Tesamorelin',
    shortName: 'TES',
    category: 'metabolic',
    tagline: 'Visceral fat reduction',
    price: '$300',
    priceUnit: '/mo',
    iconBg: '#e8f5f0',
    iconFill: '#3A5190',
    hasDetailPage: true,
  },
  {
    slug: 'aod-9604',
    name: 'AOD-9604',
    shortName: 'AOD',
    category: 'metabolic',
    tagline: 'HGH fragment for fat metabolism',
    price: '$100',
    priceUnit: '/mo',
    iconBg: '#e8f5f0',
    iconFill: '#3A5190',
    hasDetailPage: false,
  },
  // ── ENERGY & LONGEVITY ──
  {
    slug: 'sermorelin',
    name: 'Sermorelin',
    shortName: 'SER',
    category: 'energy',
    tagline: 'GH-releasing hormone analog',
    price: '$100',
    priceUnit: '/mo',
    iconBg: '#fff7e0',
    iconFill: '#b8860b',
    hasDetailPage: true,
  },
  {
    slug: 'nad',
    name: 'NAD+',
    shortName: 'NAD+',
    category: 'energy',
    tagline: 'Cellular energy & DNA repair',
    price: '$200',
    priceUnit: '/mo',
    iconBg: '#fff7e0',
    iconFill: '#b8860b',
    hasDetailPage: true,
  },
  {
    slug: 'growth-hormone',
    name: 'CJC-1295 + Ipamorelin',
    shortName: 'CJC',
    category: 'energy',
    tagline: 'GH secretagogue stack',
    price: '$150',
    priceUnit: '/mo',
    iconBg: '#f0eaff',
    iconFill: '#6b4fa0',
    hasDetailPage: true,
  },
  {
    slug: 'epitalon',
    name: 'Epitalon',
    shortName: 'EPI',
    category: 'energy',
    tagline: 'Telomere & pineal support',
    price: '$100',
    priceUnit: '/cycle',
    iconBg: '#f0eaff',
    iconFill: '#6b4fa0',
    hasDetailPage: false,
  },
  // ── HEALING & RECOVERY ──
  {
    slug: 'bpc-157',
    name: 'BPC-157',
    shortName: 'BPC',
    category: 'healing',
    tagline: 'Muscle, tendon & gut healing',
    price: '$100',
    priceUnit: '/mo',
    iconBg: '#fff0e8',
    iconFill: '#c04a2a',
    hasDetailPage: false,
  },
  {
    slug: 'tb-500',
    name: 'TB-500',
    shortName: 'TB5',
    category: 'healing',
    tagline: 'Tissue repair & anti-inflammatory',
    price: '$100',
    priceUnit: '/mo',
    iconBg: '#fff0e8',
    iconFill: '#c04a2a',
    hasDetailPage: false,
  },
  {
    slug: 'ghk-cu',
    name: 'GHK-Cu',
    shortName: 'GHK',
    category: 'healing',
    tagline: 'Skin, hair & wound regeneration',
    price: '$80',
    priceUnit: '/mo',
    iconBg: '#fff8e8',
    iconFill: '#b8860b',
    hasDetailPage: false,
  },
  {
    slug: 'glutathione',
    name: 'Glutathione',
    shortName: 'GSH',
    category: 'healing',
    tagline: 'Master antioxidant & detox',
    price: '$150',
    priceUnit: '/mo',
    iconBg: '#e8fff0',
    iconFill: '#1a8a55',
    hasDetailPage: true,
  },
  {
    slug: 'thymosin-alpha-1',
    name: 'Thymosin Alpha-1',
    shortName: 'TA1',
    category: 'healing',
    tagline: 'Immune system modulator',
    price: '$150',
    priceUnit: '/mo',
    iconBg: '#e8fff0',
    iconFill: '#1a8a55',
    hasDetailPage: false,
  },
]

// Category groupings for nav dropdowns
export const categories = [
  {
    label: 'Metabolic Health',
    slug: 'metabolic',
    viewAllSlug: 'metabolic-health',
    viewAllLabel: 'View all metabolic health',
  },
  {
    label: 'Energy & Longevity',
    slug: 'energy',
    viewAllSlug: 'energy-longevity',
    viewAllLabel: 'View all energy & longevity',
  },
  {
    label: 'Healing & Recovery',
    slug: 'healing',
    viewAllSlug: 'healing-recovery',
    viewAllLabel: 'View all healing & recovery',
  },
] as const

// Stats strip data
export const stats = [
  { value: '$0', label: 'Choose your medication — physician approves in 24 hrs' },
  { value: '$99', label: 'Ask a provider — get a personalized recommendation' },
  { value: '15+', label: 'Physician-curated peptide protocols' },
  { value: '503A', label: 'Licensed U.S. compounding pharmacies' },
]

// Gallery items
export const galleryItems = [
  {
    image: '/assets/metabolic-health.jpg',
    tag: 'Metabolic Health',
    label: 'Down 47 lbs in 6 months with Semaglutide',
  },
  {
    image: '/assets/performance.jpg',
    tag: 'Performance',
    label: 'Back to running after a knee injury with BPC-157',
  },
  {
    image: '/assets/longevity.jpg',
    tag: 'Longevity',
    label: 'Better sleep, sharper mind with CJC + Ipamorelin',
  },
  {
    image: '/assets/vitality.jpg',
    tag: 'Vitality',
    label: 'More energy, better skin with NAD+ therapy',
  },
]
