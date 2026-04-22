'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import IntakeHeader from '@/components/ui/IntakeHeader'
import { getStepValues, saveStep } from '@/lib/intake-session-store'

// ─── Assets ──────────────────────────────────────────────────────────────────

const AVATAR_URL = '/assets/avatar-eve.png'

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
      className="size-5 shrink-0" aria-hidden="true">
      <path fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Treatments ───────────────────────────────────────────────────────────────

const TREATMENTS = [
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    description: 'A copper peptide that supports skin rejuvenation, hair growth, and cellular repair.',
    badge: 'GOAL MATCH',
  },
  {
    id: 'glp-1',
    name: 'GLP-1',
    description: 'Appetite-regulating medication that supports sustained weight loss and blood sugar control.',
    badge: 'GOAL MATCH',
    defaultChecked: true,
  },
  {
    id: 'glutathione',
    name: 'Glutathione',
    description: 'A powerful antioxidant that supports detoxification, immune function, and cellular health.',
  },
  {
    id: 'nad-plus',
    name: 'NAD+',
    description: 'A coenzyme that boosts energy production, cognitive function, and metabolic health.',
    badge: 'GOAL MATCH',
  },
  {
    id: 'sermorelin',
    name: 'Sermorelin',
    description: 'A growth hormone-releasing peptide that supports lean muscle, recovery, and vitality.',
  },
] as const

type TreatmentId = typeof TREATMENTS[number]['id']

// ─── Progress ────────────────────────────────────────────────────────────────

const PROGRESS = 65

// ─── Routes ──────────────────────────────────────────────────────────────────

const NEXT_STEP = '/get-started/questionnaire/choose-medications'

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<TreatmentId>>(new Set(['glp-1']))
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    const saved = getStepValues(12)
    if (typeof saved.treatments === 'string' && saved.treatments) {
      try {
        const ids = JSON.parse(saved.treatments) as TreatmentId[]
        if (Array.isArray(ids) && ids.length > 0) setSelected(new Set(ids))
      } catch { /* ignore */ }
    }
  }, [])

  function toggle(id: TreatmentId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleContinue() {
    if (isNavigating || selected.size === 0) return
    setIsNavigating(true)
    const selectedTreatments = TREATMENTS.filter(t => selected.has(t.id))
    saveStep(
      12,
      {
        question: 'Which treatments would you like to request?',
        bubbles: selectedTreatments.map(t => t.name),
      },
      { treatments: JSON.stringify([...selected]) }
    )
    router.push(NEXT_STEP)
  }

  return (
    <>
      <IntakeHeader backHref="/get-started/questionnaire/visit-type" progress={PROGRESS} />

      <main
        className="overflow-y-auto bg-white"
        style={{
          height: 'calc(100dvh - 52px)',
          marginTop: '52px',
          paddingBottom: '5rem',
        }}
      >
        <div className="mx-auto w-full px-4 md:max-w-[480px] md:px-0 flex flex-col gap-6 md:gap-9 py-6 md:py-9">

          {/* ── Eve's question ── */}
          <div className="flex items-start gap-3 w-full">
            <div className="shrink-0 size-8 md:size-10 rounded-full overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Eve" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <p className="text-xl md:text-2xl font-normal leading-[1.5] text-[rgba(0,0,0,0.87)]">
                Which treatments would you like to request?{' '}
                <span className="text-red-500">*</span>
              </p>
              <p className="text-sm leading-5 text-[rgba(0,0,0,0.6)]">
                I&rsquo;ve pre-checked some options based on your initial interest. You may check more than one.
              </p>
            </div>
          </div>

          {/* ── Treatment cards ── */}
          <div className="flex flex-col gap-3">
            {TREATMENTS.map((t) => {
              const isSelected = selected.has(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left rounded-xl p-4 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? 'border-2 border-[#0778ba]'
                      : 'border border-[#e3e3e3] hover:border-[#0778ba]/40'
                  }`}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={`mt-0.5 shrink-0 size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-[#0778ba] bg-[#0778ba]' : 'border-[#d4d4d8] bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg viewBox="0 0 10 8" fill="none" className="size-2.5">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-base font-semibold leading-5 ${
                          isSelected ? 'text-[#0778ba]' : 'text-[rgba(0,0,0,0.87)]'
                        }`}
                      >
                        {t.name}
                      </span>
                      {'badge' in t && (
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-[#07808d] bg-[#e0f7fa] px-1.5 py-0.5 rounded-full leading-none">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[rgba(0,0,0,0.6)] leading-5">{t.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

        </div>
      </main>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-6 md:pb-12 pt-4"
        style={{ background: 'linear-gradient(to top, white 60%, rgba(255,255,255,0))' }}
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={isNavigating || selected.size === 0}
          className="
            flex items-center justify-center gap-3
            w-full md:w-[480px] h-[42px] px-4
            rounded-br-[36px] rounded-tl-[36px]
            text-white text-base font-medium leading-6 whitespace-nowrap
            transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed
            shadow-[inset_0_2px_0_0_rgba(255,255,255,0.15)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0778ba]
          "
          style={{ background: 'linear-gradient(90deg, #0778ba 0%, #0778ba 64.61%, #00b4c8 100%)' }}
        >
          Save and continue
          <ChevronRightIcon />
        </button>
      </div>
    </>
  )
}
