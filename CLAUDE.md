# CLAUDE.md

## Product context
This is a healthcare web application.
Prioritize trust, clarity, accessibility, and clean responsive behavior.
Prefer calm, simple UI over flashy or overly clever interactions.

## Stack
- Next.js
- TypeScript
- Tailwind CSS
- Supabase SSR
- React Hook Form
- Zod

## General rules
- Do not deviate from Figma specifications, create new components from it when necessary
- Prefer small, composable components
- Keep code readable and production-ready
- Do not introduce new libraries unless clearly necessary
- Do not refactor unrelated code unless asked

## Next.js rules
- Follow the existing routing structure in the repo
- If the repo uses App Router, prefer Server Components by default
- Add 'use client' only when required for event handlers, local state, browser APIs, or client-only hooks
- Keep data fetching and server-only logic on the server when possible
- Use Next.js primitives and conventions instead of generic React equivalents when appropriate
- Use proper route-level loading, error, and empty states where relevant
- Do not move logic client-side unnecessarily

## Supabase rules
- Follow the existing Supabase client setup in the repo
- Preserve SSR-safe auth and session patterns
- Do not bypass established auth, cookie, or middleware patterns
- Keep privileged or server-only Supabase logic on the server
- Reuse existing helper utilities for server and browser clients if they already exist

## Form rules
- Use React Hook Form for form state when working on forms
- Use Zod for validation when validation is needed
- Keep validation schemas clear, typed, and close to the form/domain they support
- Show validation and submission errors clearly in the UI
- Preserve accessibility for labels, descriptions, errors, and focus management
- Do not invent inconsistent form behavior across steps or screens

## Tailwind and styling rules
- Reuse existing spacing, typography, color, radius, and layout patterns
- Prefer utility classes already consistent with the codebase
- Do not hardcode one-off values unless necessary
- Match Figma hierarchy, spacing, and responsiveness 1:1
- Preserve visual consistency with the current product

## Accessibility rules
- Use semantic HTML
- Ensure keyboard accessibility and visible focus states
- Use accessible labels, descriptions, and button text
- Connect validation errors to fields correctly
- Avoid placeholder-only labeling

## Figma implementation rules
- Treat Auto Layout as flex/grid guidance
- First map designs to existing components and patterns
- Implement only the requested frame or scope
- Do not invent nearby screens, flows, or edge cases unless needed to complete the request
- When a design conflicts with established product patterns, prefer the codebase pattern unless explicitly told otherwise

## Quality bar
Before finishing:
- check visual parity with the design
- check mobile and desktop responsiveness
- check loading, empty, error, hover, focus, and disabled states where relevant
- check forms for validation, error handling, and keyboard usability
- check that server/client boundaries make sense
- check that TypeScript types are sound
- check that changes do not break auth or session flows
- check that WCAG 2.2 level AA compliance is achieved and if not, flag the gaps

## Avoid
- deviating from the Figma specifications
- unnecessary 'use client'
- duplicating components that already exist
- moving secure logic to the client
- introducing untyped data flows
- hardcoding design values without reason
- changing unrelated files or patterns
- making medical or legal copy claims unless explicitly provided

## Output expectations
When implementing a task:
1. Briefly state what is being changed
2. Mention which existing components or patterns are being reused
3. Note any important assumptions
4. Keep implementation scoped to the request