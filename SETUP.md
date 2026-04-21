# PreventiveMD — Next.js Setup

## Quick Start

```bash
cd preventivemd-next
npm install
npm run dev
```

Then open http://localhost:3000

## What's Here

This is the Next.js migration of the static HTML site. All your existing pages
have been converted to React components with TypeScript and Tailwind CSS.

### Project Structure

```
src/
├── app/                        # Routes (file = URL)
│   ├── layout.tsx              # Root layout (header, footer, analytics)
│   ├── page.tsx                # Homepage (/)
│   ├── treatments/
│   │   ├── page.tsx            # All treatments (/treatments)
│   │   └── [slug]/page.tsx     # Dynamic treatment page (/treatments/semaglutide)
│   ├── assessment/page.tsx     # Intake form placeholder (/assessment)
│   ├── choose-path/page.tsx    # Async vs sync selector (/choose-path)
│   └── waitlist/page.tsx       # Waitlist signup (/waitlist)
│
├── components/
│   ├── layout/                 # Shared: Header, Footer, Analytics
│   ├── ui/                     # Homepage sections
│   └── treatments/             # Treatment page components
│
└── lib/
    ├── constants.ts            # Nav data, stats, gallery items
    ├── protocols.ts            # Treatment card data (homepage grid)
    └── treatment-data.ts       # Treatment detail page content
```

### Key Differences from HTML

| HTML Site | Next.js |
|-----------|---------|
| Copy-paste header/footer in every file | One `layout.tsx` wraps all pages |
| 800+ line files with inline CSS/JS | Small components with Tailwind |
| `onclick="filter('all', this)"` | `useState` + declarative rendering |
| 11 separate treatment HTML files | 1 dynamic `[slug]/page.tsx` + data file |
| Manual `<script>` tags | `<Script>` component with load strategies |

### What's Next (Week 1, Day 3-5)

- [ ] Set up Supabase project + auth
- [ ] Migrate the 16-step intake form (React Hook Form + Zod)
- [ ] Wire form submission to Supabase
- [ ] Add remaining treatment detail data (4 more treatments)
