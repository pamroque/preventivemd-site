import { stats } from '@/lib/constants'

/*
 * StatsStrip.tsx — The navy bar with $0, $35, 15+, 503A
 *
 * Server Component — no interactivity needed. Pure HTML output.
 * Data comes from constants.ts so it's easy to update.
 */

export function StatsStrip() {
  return (
    <div className="bg-navy py-9 px-8 md:px-[72px] flex flex-wrap items-center justify-center">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`flex-1 min-w-[200px] text-center px-7 ${
            i < stats.length - 1 ? 'border-r border-white/10' : ''
          }`}
        >
          <span className="text-[2.2rem] font-extralight leading-none mb-1.5 block gradient-text">
            {stat.value}
          </span>
          <div className="text-[0.76rem] text-white/50 font-light tracking-wide">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
