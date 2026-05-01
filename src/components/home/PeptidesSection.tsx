import Image from 'next/image'

export default function PeptidesSection() {
  return (
    <section
      aria-labelledby="peptides-heading"
      className="flex flex-col gap-9 md:flex-row md:items-center md:gap-[72px]"
    >
      {/* Title + image */}
      <div className="flex shrink-0 flex-col gap-6 md:w-[280px]">
        <div className="flex flex-col gap-3">
          <p className="text-[14px] font-medium leading-5 text-[#71717a] md:text-[16px] md:leading-6">
            The science, simplified
          </p>
          <h2
            id="peptides-heading"
            className="font-extralight leading-[1.1] text-[#09090b]"
          >
            <span className="text-[36px] md:text-[54px]">What are </span>
            <span className="font-serif italic text-[42px] md:text-[64px]">peptides?</span>
          </h2>
        </div>
        <Image
          src="/assets/home/peptide-illustration.png"
          alt=""
          width={716}
          height={466}
          sizes="(min-width: 768px) 280px, 100vw"
          className="float-gentle h-auto w-full"
        />
      </div>

      {/* Paragraphs */}
      <div className="flex min-w-0 flex-1 flex-col gap-9 text-[#09090b]">
        <p className="text-[16px] leading-6 md:text-[18px] md:leading-7">
          Peptides are short chains of amino acids — the same building blocks that make up proteins.{' '}
          <span className="font-bold">
            Many work like tiny messengers, signaling parts of your body to do specific things.
          </span>
        </p>
        <p className="text-[16px] leading-6 md:text-[18px] md:leading-7">
          What makes peptides interesting is how focused they are.{' '}
          <span className="font-bold">
            They often work alongside systems your body already has, helping support what's already there.
          </span>
        </p>
        <p className="text-[16px] leading-6 md:text-[18px] md:leading-7">
          That said, peptides are powerful tools, and results depend on using high-quality products, the right dose, and proper medical guidance. Working with a qualified provider is the best way to find out if a peptide is right for your goals and health.
        </p>
      </div>
    </section>
  )
}
