import { galleryItems } from '@/lib/constants'

/*
 * GallerySection.tsx — "Who We Treat" photo grid
 *
 * Server Component. Static content, no JS shipped.
 *
 * NOTE: The hover zoom effect on cards uses pure CSS (group-hover),
 * so we don't need 'use client'. Tailwind's group utility handles it.
 */

export function GallerySection() {
  return (
    <section className="pt-24">
      {/* Intro */}
      <div className="max-w-[1200px] mx-auto px-8 md:px-[72px] pb-12">
        <div className="section-label">Who We Treat</div>
        <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-extralight tracking-tight leading-tight text-navy max-w-[560px]">
          Real people. Real goals.
          <br />
          Real results.
        </h2>
        <p className="text-[0.97rem] text-muted font-light leading-relaxed max-w-[480px] mt-3.5">
          From metabolic health to injury recovery to simply feeling like
          yourself again — our protocols are designed for people who are serious
          about their health.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[3px]" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr' }}>
        {galleryItems.map((item, i) => (
          <div
            key={i}
            className="relative overflow-hidden cursor-pointer group"
            style={{ height: '480px' }}
          >
            {/* Background image with hover zoom */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-[#1a2d44] transition-transform duration-700 group-hover:scale-[1.06]"
              style={{ backgroundImage: `url('${item.image}')` }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,22,40,0.88)] to-transparent flex flex-col justify-end p-6">
              <div className="text-[0.65rem] font-semibold tracking-[1.2px] uppercase text-teal-brand mb-1.5">
                {item.tag}
              </div>
              <div className="text-[1.05rem] font-light text-white leading-snug">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
