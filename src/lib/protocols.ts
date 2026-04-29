/*
 * protocols.ts — Full treatment card data for the homepage grid
 *
 * This is separate from constants.ts because it's page-specific data,
 * not shared across the whole app. The homepage protocols grid uses this.
 * Treatment detail pages will have their own content.
 */

export type ProtocolCard = {
  name: string
  slug: string          // URL slug for detail page
  also: string          // Subtitle / alt names
  desc: string          // Short description
  price: string         // e.g. "$150 / mo"
  categories: string[]  // filter categories
  badges: { label: string; bg: string; text: string; border: string }[]
  hasDetailPage: boolean
  ctaLabel: string      // "Get Started" or "Join Waitlist"
  ctaHref: string
  // Controls whether the card appears on the homepage grid and the
  // /treatments index. Detail pages remain reachable directly so they
  // can be re-enabled by flipping this flag back to true.
  visible: boolean
}

// Filter categories. The "all" label has no count baked in — consumers
// compute the count from the visible protocols so it stays in sync.
export const filterCategories = [
  { key: 'all', label: 'All' },
  { key: 'weight', label: 'Metabolic Health' },
  { key: 'energy', label: 'Fatigue & Energy' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'healing', label: 'Healing & Recovery' },
  { key: 'brain', label: 'Cognitive & Brain' },
  { key: 'sexual', label: 'Sexual Health' },
  { key: 'immune', label: 'Immunity' },
  { key: 'longevity', label: 'Longevity' },
  { key: 'skin', label: 'Skin & Hair' },
]

/*
 * Badge colors as inline styles (not Tailwind classes).
 *
 * KEY CONCEPT: Tailwind purging
 * Tailwind's JIT compiler scans your source files for class names.
 * When classes are in a variable (like badgeColors['weight']), Tailwind
 * can't see them at build time and strips them from the CSS bundle.
 *
 * Fix: use inline styles for dynamic colors. Tailwind classes work great
 * for static/known classes — inline styles are better for data-driven colors.
 */
const badgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  weight:    { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  energy:    { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  sleep:     { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
  healing:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  brain:     { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  sexual:    { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  immune:    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  longevity: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  skin:      { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
}

const defaultBadge = { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' }

function badge(cat: string, label: string) {
  const style = badgeStyles[cat] || defaultBadge
  return { label, ...style }
}

export const protocols: ProtocolCard[] = [
  {
    name: 'Semaglutide',
    slug: 'semaglutide',
    also: 'Compounded semaglutide',
    desc: 'Semaglutide is an FDA-approved medication that mimics the GLP-1 hormone to regulate blood sugar, reduce appetite, and promote significant weight loss.',
    price: '$150 / mo',
    categories: ['weight'],
    badges: [badge('weight', 'Metabolic Health')],
    hasDetailPage: true,
    ctaLabel: 'Get Started',
    ctaHref: '/get-started',
    visible: true,
  },
  {
    name: 'Tirzepatide',
    slug: 'tirzepatide',
    also: 'Compounded tirzepatide',
    desc: 'A dual GLP-1 + GIP receptor agonist — the next generation of metabolic health therapy. Targets two hunger-regulating hormones simultaneously.',
    price: '$200 / mo',
    categories: ['weight'],
    badges: [badge('weight', 'Metabolic Health')],
    hasDetailPage: true,
    ctaLabel: 'Get Started',
    ctaHref: '/get-started',
    visible: true,
  },
  {
    name: 'Sermorelin',
    slug: 'sermorelin',
    also: 'GHRH analog \u00b7 Entry-level GH therapy',
    desc: 'A growth hormone-releasing hormone analog that stimulates the pituitary gland to produce more natural GH. Well-tolerated and a popular first step for anti-aging.',
    price: '$100 / mo',
    categories: ['energy', 'longevity', 'sleep'],
    badges: [badge('energy', 'Fatigue & Energy'), badge('longevity', 'Longevity'), badge('sleep', 'Sleep')],
    hasDetailPage: true,
    ctaLabel: 'Get Started',
    ctaHref: '/get-started',
    visible: true,
  },
  {
    name: 'Glutathione',
    slug: 'glutathione',
    also: 'Master antioxidant \u00b7 Detox & skin brightening',
    desc: 'The body\'s most powerful endogenous antioxidant. Neutralizes free radicals, supports liver detoxification, brightens skin tone, and strengthens immune defense.',
    price: '$150 / mo',
    categories: ['immune', 'skin', 'longevity'],
    badges: [badge('immune', 'Immunity'), badge('skin', 'Skin & Hair'), badge('longevity', 'Longevity')],
    hasDetailPage: true,
    ctaLabel: 'Get Started',
    ctaHref: '/get-started',
    visible: true,
  },
  {
    name: 'NAD+',
    slug: 'nad',
    also: 'Nicotinamide Adenine Dinucleotide \u00b7 Multiple delivery methods',
    desc: 'A critical cellular coenzyme that declines significantly with age. Restoring NAD+ levels boosts mitochondrial energy production and enhances DNA repair.',
    price: '$200 / mo',
    categories: ['energy', 'brain', 'longevity'],
    badges: [badge('energy', 'Fatigue & Energy'), badge('brain', 'Cognitive & Brain'), badge('longevity', 'Longevity')],
    hasDetailPage: true,
    ctaLabel: 'Get Started',
    ctaHref: '/get-started',
    visible: true,
  },
  {
    name: 'GHK-Cu',
    slug: 'ghk-cu',
    also: 'Copper peptide \u00b7 Topical & injectable',
    desc: 'One of the most well-researched beauty peptides. Stimulates collagen and elastin production, repairs damaged skin, and reverses hair thinning.',
    price: '$80 / mo',
    categories: ['healing', 'skin', 'longevity'],
    badges: [badge('healing', 'Healing & Recovery'), badge('skin', 'Skin & Hair'), badge('longevity', 'Longevity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: true,
  },
  {
    name: 'Tesamorelin',
    slug: 'tesamorelin',
    also: 'FDA-approved GHRH \u00b7 Visceral fat reduction',
    desc: 'An FDA-approved growth hormone-releasing factor proven to reduce visceral belly fat and improve metabolic markers.',
    price: '$300 / mo',
    categories: ['weight', 'longevity'],
    badges: [badge('weight', 'Metabolic Health'), badge('longevity', 'Longevity')],
    hasDetailPage: true,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'BPC-157',
    slug: 'bpc-157',
    also: 'Body Protection Compound',
    desc: 'One of the most versatile healing peptides available. Accelerates recovery of muscles, tendons, ligaments, and gut lining.',
    price: '$100 / mo',
    categories: ['healing', 'immune'],
    badges: [badge('healing', 'Healing & Recovery'), badge('immune', 'Immunity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'CJC-1295 + Ipamorelin',
    slug: 'growth-hormone',
    also: 'GH Secretagogue Stack \u00b7 Anti-aging staple',
    desc: 'The gold-standard growth hormone-stimulating combination. Promotes fat loss, lean muscle, deeper sleep, and cellular repair.',
    price: '$150 / mo',
    categories: ['energy', 'longevity', 'sleep'],
    badges: [badge('energy', 'Fatigue & Energy'), badge('longevity', 'Longevity'), badge('sleep', 'Sleep')],
    hasDetailPage: true,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'PT-141',
    slug: 'pt-141',
    also: 'Bremelanotide \u00b7 Works for men and women',
    desc: 'Unlike PDE5 inhibitors, PT-141 works centrally through the brain\'s melanocortin receptors to enhance libido and arousal. Effective for both men and women.',
    price: '$80 / mo',
    categories: ['sexual'],
    badges: [badge('sexual', 'Sexual Health')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'Thymosin Alpha-1',
    slug: 'thymosin-alpha-1',
    also: 'Immune modulator \u00b7 Post-illness recovery',
    desc: 'A naturally occurring thymic peptide that regulates and strengthens immune function. Used for chronic infections and post-viral recovery.',
    price: '$150 / mo',
    categories: ['immune', 'longevity'],
    badges: [badge('immune', 'Immunity'), badge('longevity', 'Longevity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'TB-500',
    slug: 'tb-500',
    also: 'Thymosin Beta-4 \u00b7 Often stacked with BPC-157',
    desc: 'Promotes systemic tissue repair, reduces inflammation, and improves flexibility and range of motion throughout the entire body.',
    price: '$100 / mo',
    categories: ['healing', 'immune'],
    badges: [badge('healing', 'Healing & Recovery'), badge('immune', 'Immunity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'Epitalon',
    slug: 'epitalon',
    also: 'Pineal gland peptide \u00b7 Telomere support',
    desc: 'A tetrapeptide that stimulates telomerase — the enzyme that maintains and repairs telomere length. One of the most compelling longevity peptides.',
    price: '$100 / cycle',
    categories: ['sleep', 'longevity'],
    badges: [badge('sleep', 'Sleep & Circadian'), badge('longevity', 'Longevity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'Pinealon',
    slug: 'pinealon',
    also: 'Neuropeptide bioregulator \u00b7 Oral capsule format',
    desc: 'A tripeptide bioregulator derived from the pineal gland that supports healthy circadian rhythm, sleep architecture, and neuroprotection.',
    price: '$40 / mo',
    categories: ['sleep', 'longevity'],
    badges: [badge('sleep', 'Sleep & Circadian'), badge('longevity', 'Longevity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'Selank / Semax',
    slug: 'selank-semax',
    also: 'Cognitive peptides \u00b7 Anxiolytic & nootropic',
    desc: 'Two complementary cognitive peptides: Selank delivers calm focus by modulating GABA and serotonin. Semax enhances memory via BDNF and dopamine.',
    price: '$80 / mo',
    categories: ['brain', 'longevity', 'sleep'],
    badges: [badge('brain', 'Cognitive & Brain'), badge('sleep', 'Mood & Anxiety'), badge('longevity', 'Longevity')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
  {
    name: 'AOD-9604',
    slug: 'aod-9604',
    also: 'HGH fragment \u00b7 Body recomposition',
    desc: 'A stabilized fragment of human growth hormone that targets fat metabolism specifically — without the growth-promoting or blood sugar effects of full HGH.',
    price: '$100 / mo',
    categories: ['weight'],
    badges: [badge('weight', 'Metabolic Health')],
    hasDetailPage: false,
    ctaLabel: 'Join Waitlist',
    ctaHref: '/waitlist',
    visible: false,
  },
]

// Cards that should appear on the homepage grid and the /treatments index.
// Detail pages remain reachable directly via /treatments/[slug] regardless
// of this flag — flip `visible` back to true to re-list a treatment.
export const visibleProtocols = protocols.filter((p) => p.visible)
