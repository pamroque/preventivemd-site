/*
 * treatment-data.ts — Structured content for treatment detail pages
 *
 * KEY CONCEPT: Data-driven pages
 *
 * In your HTML site, each treatment is a separate 800+ line file
 * with copy-pasted CSS, headers, footers, and layout code.
 * When you want to change the FAQ section design, you edit 11 files.
 *
 * In Next.js, we separate CONTENT (this file) from PRESENTATION
 * (the page component). One template renders all treatments.
 * Add a new treatment = add an object here. Done.
 *
 * For now I'm including semaglutide as the complete example.
 * We'll populate the rest from your existing HTML files.
 */

export type TreatmentDetail = {
  slug: string
  category: string
  categoryColor: string
  title: string
  highlight: string       // The bold/gradient word in the title
  subtitle: string
  metaDescription: string
  heroStats: { value: string; label: string }[]
  howItWorks: { title: string; desc: string }[]
  benefits: { title: string; desc: string; icon: string }[]
  protocol: { title: string; desc: string }[]
  faqs: { q: string; a: string }[]
  price: string
  priceNote: string
}

export const treatmentDetails: Record<string, TreatmentDetail> = {
  semaglutide: {
    slug: 'semaglutide',
    category: 'Metabolic Health',
    categoryColor: '#0071bc',
    title: 'Compounded',
    highlight: 'Semaglutide',
    subtitle:
      'An FDA-approved GLP-1 receptor agonist that regulates blood sugar, reduces appetite, and promotes significant, sustained weight loss — prescribed by a physician, delivered to your door.',
    metaDescription:
      'Physician-prescribed compounded semaglutide — an FDA-approved GLP-1 receptor agonist for weight loss. Start your intake today.',
    heroStats: [
      { value: '15%', label: 'Avg body weight loss' },
      { value: '24hr', label: 'Physician review' },
      { value: '$150', label: 'Starting from /mo' },
    ],
    howItWorks: [
      {
        title: 'Complete Your Intake',
        desc: 'Answer a 5-minute health questionnaire. No appointment needed — do it on your schedule.',
      },
      {
        title: 'Physician Review',
        desc: 'A licensed provider reviews your intake within 24 hours and prescribes your personalized protocol.',
      },
      {
        title: 'Medication Ships',
        desc: 'Your compounded semaglutide ships directly from a licensed 503A pharmacy to your door.',
      },
    ],
    benefits: [
      {
        title: 'Suppresses appetite',
        desc: 'GLP-1 activation reduces hunger signals at the brain level — not just willpower.',
        icon: '🎯',
      },
      {
        title: 'Slows gastric emptying',
        desc: 'Food moves through your system more slowly, keeping you fuller longer after meals.',
        icon: '⏱️',
      },
      {
        title: 'Stabilizes blood sugar',
        desc: 'Reduces insulin spikes and crashes that trigger cravings and energy dips.',
        icon: '📊',
      },
      {
        title: 'Improves metabolic markers',
        desc: 'Clinical evidence for improved A1C, cholesterol, and cardiovascular risk factors.',
        icon: '❤️',
      },
    ],
    protocol: [
      {
        title: 'Starting dose — getting acclimated',
        desc: 'Weeks 1–4: Low-dose introduction. Your body adjusts to GLP-1 activation. Most patients notice reduced appetite within the first 1–2 weeks.',
      },
      {
        title: 'First increase — appetite shifts',
        desc: 'Weeks 5–8: Dose increase per protocol. Appetite suppression becomes more pronounced. Portion sizes naturally decrease.',
      },
      {
        title: 'Building momentum',
        desc: 'Weeks 9–12: Another titration step. Weight loss accelerates. Energy and metabolic markers begin to improve measurably.',
      },
      {
        title: 'Approaching maintenance',
        desc: 'Weeks 13–16+: Target dose reached. Physician evaluates progress and adjusts protocol based on labs and clinical response.',
      },
    ],
    faqs: [
      {
        q: 'What exactly is compounded semaglutide?',
        a: 'Compounded semaglutide is a GLP-1 receptor agonist prepared by a licensed 503A/503B compounding pharmacy. Your physician prescribes a personalized dosing protocol based on your health profile and metabolic goals.',
      },
      {
        q: 'What are the side effects?',
        a: "Mild nausea is the most common, especially during early weeks or after dose increases. That's why we titrate gradually over 12–16 weeks. Other possible effects include constipation and decreased appetite. Most side effects improve as your body adjusts.",
      },
      {
        q: 'How fast will I see results?',
        a: 'Reduced appetite within the first 1–2 weeks. Visible changes typically by weeks 4–8. Clinical trials showed 12–17% body weight reduction over about 16 months.',
      },
      {
        q: 'Do I need lab work?',
        a: 'Your physician may recommend baseline labs and periodic follow-ups to monitor progress safely.',
      },
      {
        q: "What if I'm not approved?",
        a: "You pay nothing. If your physician determines this isn't clinically appropriate based on your history, you won't be charged.",
      },
    ],
    price: '$150',
    priceNote: 'Starting from / month. Includes medication + physician oversight.',
  },

  tirzepatide: {
    slug: 'tirzepatide',
    category: 'Metabolic Health',
    categoryColor: '#0071bc',
    title: 'Compounded',
    highlight: 'Tirzepatide',
    subtitle:
      'A dual-acting GLP-1 + GIP receptor agonist — the most effective weight loss medication available. Targets two hunger-regulating hormones simultaneously.',
    metaDescription:
      'Physician-prescribed compounded tirzepatide — a dual GLP-1/GIP receptor agonist for maximum weight loss results.',
    heroStats: [
      { value: '22%', label: 'Avg body weight loss' },
      { value: '24hr', label: 'Physician review' },
      { value: '$200', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: 'Answer a 5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'A licensed provider reviews and prescribes within 24 hours.' },
      { title: 'Medication Ships', desc: 'Compounded tirzepatide shipped from a licensed pharmacy to your door.' },
    ],
    benefits: [
      { title: 'Dual hormone action', desc: 'Activates both GLP-1 and GIP receptors for greater appetite suppression.', icon: '🎯' },
      { title: 'Superior weight loss', desc: 'Clinical trials showed up to 22.5% body weight reduction — more than any other medication.', icon: '📉' },
      { title: 'Blood sugar control', desc: 'FDA-approved for type 2 diabetes. Dramatically improves insulin sensitivity.', icon: '📊' },
      { title: 'Cardiovascular benefits', desc: 'Reduces inflammation, improves lipid profiles, and lowers cardiovascular risk.', icon: '❤️' },
    ],
    protocol: [
      { title: 'Weeks 1–4: Starting dose', desc: 'Low-dose introduction. GLP-1 + GIP receptors begin activating.' },
      { title: 'Weeks 5–8: First escalation', desc: 'Dose increase. Appetite suppression intensifies.' },
      { title: 'Weeks 9–12: Accelerating', desc: 'Weight loss accelerates. Metabolic markers improve.' },
      { title: 'Weeks 13+: Maintenance', desc: 'Target dose reached. Physician adjusts based on response.' },
    ],
    faqs: [
      { q: 'How is tirzepatide different from semaglutide?', a: 'Tirzepatide activates TWO receptors (GLP-1 + GIP) instead of one. Clinical trials showed greater weight loss and better metabolic outcomes.' },
      { q: 'What are the side effects?', a: 'Similar to semaglutide — mild nausea early on, improving with gradual dose titration. GI effects are typically transient.' },
      { q: 'How fast will I see results?', a: 'Appetite reduction in 1–2 weeks. Visible changes by weeks 4–8. Significant results by 12–16 weeks.' },
    ],
    price: '$200',
    priceNote: 'Starting from / month. Includes medication + physician oversight.',
  },

  nad: {
    slug: 'nad',
    category: 'Energy & Longevity',
    categoryColor: '#b8860b',
    title: '',
    highlight: 'NAD+',
    subtitle:
      'A critical cellular coenzyme that declines with age. Restoring NAD+ levels boosts mitochondrial energy, enhances DNA repair, and activates longevity pathways.',
    metaDescription:
      'NAD+ therapy for cellular energy, DNA repair, and longevity. Multiple delivery methods available.',
    heroStats: [
      { value: '50%', label: 'NAD+ decline by age 50' },
      { value: '24hr', label: 'Physician review' },
      { value: '$200', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: 'Answer a 5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'Provider reviews and selects optimal delivery method.' },
      { title: 'Treatment Begins', desc: 'NAD+ therapy shipped or administered per your protocol.' },
    ],
    benefits: [
      { title: 'Cellular energy', desc: 'Powers mitochondria — your cells\' energy factories.', icon: '⚡' },
      { title: 'DNA repair', desc: 'Activates PARP enzymes critical for fixing DNA damage.', icon: '🧬' },
      { title: 'Sirtuin activation', desc: 'Turns on longevity genes that regulate aging and metabolism.', icon: '🔬' },
      { title: 'Neuroprotection', desc: 'Supports brain health, focus, and cognitive resilience.', icon: '🧠' },
    ],
    protocol: [
      { title: 'Assessment', desc: 'Physician determines optimal delivery method based on your goals.' },
      { title: 'Loading phase', desc: 'Higher initial doses to rapidly restore NAD+ levels.' },
      { title: 'Maintenance', desc: 'Ongoing supplementation to maintain elevated NAD+ levels.' },
      { title: 'Monitoring', desc: 'Periodic check-ins to optimize dosing and assess response.' },
    ],
    faqs: [
      { q: 'What delivery methods are available?', a: 'Subcutaneous injection, nasal spray, and oral supplementation. Your physician will recommend the best option.' },
      { q: 'How quickly will I feel a difference?', a: 'Many patients report improved energy and mental clarity within the first 1–2 weeks.' },
      { q: 'Are there side effects?', a: 'Generally well-tolerated. Some patients experience mild flushing or GI discomfort initially.' },
    ],
    price: '$200',
    priceNote: 'Starting from / month. Delivery method affects pricing.',
  },

  sermorelin: {
    slug: 'sermorelin',
    category: 'Energy & Longevity',
    categoryColor: '#b8860b',
    title: '',
    highlight: 'Sermorelin',
    subtitle:
      'A growth hormone-releasing hormone (GHRH) analog that stimulates your pituitary gland to produce more natural growth hormone. The most popular entry point for GH therapy.',
    metaDescription:
      'Sermorelin — a GHRH analog for natural growth hormone optimization. Improves sleep, energy, and body composition.',
    heroStats: [
      { value: '8hrs', label: 'Deeper sleep within weeks' },
      { value: '24hr', label: 'Physician review' },
      { value: '$100', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: '5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'Licensed provider reviews within 24 hours.' },
      { title: 'Medication Ships', desc: 'Compounded sermorelin from a licensed pharmacy.' },
    ],
    benefits: [
      { title: 'Better sleep', desc: 'Deeper, more restorative sleep — often the first benefit patients notice.', icon: '😴' },
      { title: 'Body composition', desc: 'Supports lean muscle growth and fat loss over time.', icon: '💪' },
      { title: 'Energy & recovery', desc: 'Improved exercise recovery and sustained daytime energy.', icon: '⚡' },
      { title: 'Anti-aging', desc: 'Supports skin elasticity, hair quality, and overall vitality.', icon: '✨' },
    ],
    protocol: [
      { title: 'Weeks 1–4', desc: 'Nightly subcutaneous injection. Sleep improvements typically appear first.' },
      { title: 'Weeks 5–12', desc: 'Body composition changes become noticeable. Energy improves.' },
      { title: 'Months 3–6', desc: 'Full benefits realized. Physician may adjust dose.' },
      { title: 'Ongoing', desc: 'Maintenance dosing with periodic physician check-ins.' },
    ],
    faqs: [
      { q: 'How is sermorelin different from HGH?', a: 'Sermorelin stimulates your body to produce its own GH naturally, rather than injecting synthetic hormone. Safer and more physiological.' },
      { q: 'When should I take it?', a: 'Typically before bed — GH release is highest during sleep, and sermorelin enhances that natural rhythm.' },
    ],
    price: '$100',
    priceNote: 'Starting from / month.',
  },

  'growth-hormone': {
    slug: 'growth-hormone',
    category: 'Energy & Longevity',
    categoryColor: '#6b4fa0',
    title: '',
    highlight: 'CJC-1295 + Ipamorelin',
    subtitle:
      'The gold-standard growth hormone secretagogue combination. CJC-1295 extends the GH release window while Ipamorelin triggers a clean pulse.',
    metaDescription:
      'CJC-1295 + Ipamorelin — the gold-standard GH secretagogue stack for anti-aging, fat loss, and sleep optimization.',
    heroStats: [
      { value: '2x', label: 'GH pulse vs sermorelin alone' },
      { value: '24hr', label: 'Physician review' },
      { value: '$150', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: '5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'Provider reviews and prescribes within 24 hours.' },
      { title: 'Medication Ships', desc: 'Combined formulation from a licensed pharmacy.' },
    ],
    benefits: [
      { title: 'Fat loss', desc: 'Accelerates lipolysis — particularly effective for stubborn abdominal fat.', icon: '🔥' },
      { title: 'Lean muscle', desc: 'Supports muscle protein synthesis without androgenic side effects.', icon: '💪' },
      { title: 'Deep sleep', desc: 'Enhanced slow-wave sleep — the most restorative phase.', icon: '😴' },
      { title: 'Cellular repair', desc: 'GH drives tissue repair, collagen synthesis, and immune function.', icon: '🧬' },
    ],
    protocol: [
      { title: 'Weeks 1–4', desc: 'Nightly injections. Sleep quality improves first.' },
      { title: 'Weeks 5–12', desc: 'Body composition changes. Fat loss and recovery improve.' },
      { title: 'Months 3–6', desc: 'Peak benefits. Lean muscle, energy, and skin quality.' },
      { title: 'Ongoing', desc: 'Maintenance with cycling periods as recommended by physician.' },
    ],
    faqs: [
      { q: 'Why combine CJC-1295 with Ipamorelin?', a: 'CJC-1295 extends the duration of GH release while Ipamorelin creates a clean, targeted pulse. Together they produce a sustained, natural GH elevation.' },
      { q: 'Is this the same as synthetic HGH?', a: 'No — these peptides stimulate your own pituitary to release growth hormone naturally, avoiding the risks of exogenous HGH.' },
    ],
    price: '$150',
    priceNote: 'Starting from / month.',
  },

  glutathione: {
    slug: 'glutathione',
    category: 'Healing & Recovery',
    categoryColor: '#1a8a55',
    title: '',
    highlight: 'Glutathione',
    subtitle:
      "The body's master antioxidant. Neutralizes free radicals, supports liver detoxification, brightens skin, and strengthens immune defense.",
    metaDescription:
      'Glutathione — the master antioxidant for detox, skin brightening, and immune support.',
    heroStats: [
      { value: '#1', label: 'Most powerful endogenous antioxidant' },
      { value: '24hr', label: 'Physician review' },
      { value: '$150', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: '5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'Provider reviews within 24 hours.' },
      { title: 'Treatment Ships', desc: 'Injectable or oral glutathione from licensed pharmacy.' },
    ],
    benefits: [
      { title: 'Detoxification', desc: 'The liver\'s primary detox molecule. Binds and eliminates toxins, heavy metals, and free radicals.', icon: '🛡️' },
      { title: 'Skin brightening', desc: 'Inhibits melanin production for a brighter, more even skin tone.', icon: '✨' },
      { title: 'Immune support', desc: 'Powers lymphocyte function — your immune system\'s front line.', icon: '🦠' },
      { title: 'Anti-aging', desc: 'Protects mitochondria and DNA from oxidative damage.', icon: '🧬' },
    ],
    protocol: [
      { title: 'Assessment', desc: 'Physician selects delivery method based on your goals.' },
      { title: 'Loading phase', desc: 'Higher doses to restore depleted levels.' },
      { title: 'Maintenance', desc: 'Ongoing supplementation for sustained protection.' },
      { title: 'Optimization', desc: 'Dose adjusted based on clinical response.' },
    ],
    faqs: [
      { q: 'Why not just take oral glutathione?', a: 'Oral bioavailability is low. Injectable or liposomal forms bypass the digestive system for better absorption.' },
      { q: 'How long until I see skin benefits?', a: 'Most patients notice brighter, clearer skin within 2–4 weeks of consistent use.' },
    ],
    price: '$150',
    priceNote: 'Starting from / month.',
  },

  tesamorelin: {
    slug: 'tesamorelin',
    category: 'Metabolic Health',
    categoryColor: '#0071bc',
    title: 'FDA-Approved',
    highlight: 'Tesamorelin',
    subtitle:
      'An FDA-approved growth hormone-releasing factor clinically proven to reduce visceral abdominal fat and improve metabolic markers.',
    metaDescription:
      'Tesamorelin — FDA-approved GHRH for visceral fat reduction and metabolic health.',
    heroStats: [
      { value: '18%', label: 'Avg visceral fat reduction' },
      { value: '24hr', label: 'Physician review' },
      { value: '$300', label: 'Starting from /mo' },
    ],
    howItWorks: [
      { title: 'Complete Your Intake', desc: '5-minute health questionnaire.' },
      { title: 'Physician Review', desc: 'Provider reviews and prescribes within 24 hours.' },
      { title: 'Medication Ships', desc: 'Tesamorelin from a licensed pharmacy.' },
    ],
    benefits: [
      { title: 'Visceral fat reduction', desc: 'Specifically targets dangerous belly fat that surrounds your organs.', icon: '🎯' },
      { title: 'Metabolic improvement', desc: 'Improves insulin sensitivity and lipid profiles.', icon: '📊' },
      { title: 'Body composition', desc: 'Lean muscle preservation while reducing fat mass.', icon: '💪' },
      { title: 'Cardiovascular health', desc: 'Reduces inflammatory markers associated with heart disease.', icon: '❤️' },
    ],
    protocol: [
      { title: 'Weeks 1–4', desc: 'Daily subcutaneous injection. Metabolic changes begin.' },
      { title: 'Weeks 5–12', desc: 'Visceral fat reduction becomes measurable.' },
      { title: 'Weeks 13–26', desc: 'Peak fat reduction. Metabolic markers improve significantly.' },
      { title: 'Ongoing', desc: 'Maintenance protocol based on imaging and labs.' },
    ],
    faqs: [
      { q: 'What is visceral fat?', a: 'Fat stored deep inside the abdominal cavity, surrounding vital organs. It\'s metabolically active and drives inflammation, insulin resistance, and cardiovascular risk.' },
      { q: 'Is this FDA-approved?', a: 'Yes — tesamorelin is FDA-approved for the reduction of excess abdominal fat.' },
    ],
    price: '$300',
    priceNote: 'Starting from / month.',
  },
}

// Get all slugs for static generation
export function getAllTreatmentSlugs(): string[] {
  return Object.keys(treatmentDetails)
}
