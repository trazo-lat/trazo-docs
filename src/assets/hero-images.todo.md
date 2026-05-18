# Hero Images TODO — Query Docs

Tracks the per-page hero images for the Query Language docs section. Each row
maps to a page and a pair of WebP files (dark + light variants).

## Status

| Page | Dark variant | Light variant | Prompt file |
|------|--------------|---------------|-------------|
| `query/overview` | ✅ `query-hero.webp` (Gemini, 2400×712) | ⬜ `query-overview-hero-light.webp` | `/tmp/query-hero-overview.md` |
| `query/syntax` | ⬜ `query-syntax-hero.webp` | ⬜ `query-syntax-hero-light.webp` | `/tmp/query-hero-syntax.md` |
| `query/examples` | ⬜ `query-examples-hero.webp` | ⬜ `query-examples-hero-light.webp` | `/tmp/query-hero-examples.md` |
| `query/codegen` | ⬜ `query-codegen-hero.webp` | ⬜ `query-codegen-hero-light.webp` | `/tmp/query-hero-codegen.md` |
| `query/faq` | ⬜ `query-faq-hero.webp` | ⬜ `query-faq-hero-light.webp` | `/tmp/query-hero-faq.md` |
| `query/coverage` | ⬜ `query-coverage-hero.webp` | ⬜ `query-coverage-hero-light.webp` | `/tmp/query-hero-coverage.md` |

Note: `/tmp/` is the local machine; copy the prompt files somewhere durable
before relying on them (they don't survive a reboot).

## Per-page workflow

For each row above:

1. Open the prompt file (`/tmp/query-hero-<page>.md`).
2. Feed the **dark prompt** to the image tool (Gemini, DALL·E 3, Midjourney,
   SDXL). Target 10:3 aspect ratio.
3. Feed the **light prompt** separately. Same composition, inverted palette.
4. Compress each output:
   ```bash
   magick <dark>.png  -resize 2400x -strip -quality 88  src/assets/query-<page>-hero.webp
   magick <light>.png -resize 2400x -strip -quality 88  src/assets/query-<page>-hero-light.webp
   ```
   Target ≤ 60 KB per variant.
5. At the top of `src/content/docs/query/<page>.mdx`, wire both:
   ```mdx
   import { Image } from 'astro:assets';
   import heroDark from '../../../assets/query-<page>-hero.webp';
   import heroLight from '../../../assets/query-<page>-hero-light.webp';

   <Image src={heroDark}  alt="..." class="hero-dark" />
   <Image src={heroLight} alt="..." class="hero-light" />
   ```
6. Add to `src/styles/custom.css` once (skip if already present):
   ```css
   :root[data-theme='dark']  .hero-light { display: none; }
   :root[data-theme='light'] .hero-dark  { display: none; }
   ```
7. Mark the row above with ✅.

## Existing image notes

- `query-hero.webp` — current Overview hero, Gemini-generated, dark only.
  Already wired in `overview.mdx` as a single `<Image>` (no light variant
  yet). When generating the light variant, also restructure the import to
  use the `hero-dark` / `hero-light` class pattern from step 5.

## Acceptance

A page is "done" when:

- Both WebP variants exist in `src/assets/` with sizes ≤ 60 KB each.
- The MDX imports both with class hints.
- The CSS hide/show rule is in `src/styles/custom.css`.
- `yarn build` produces no warnings about missing images.
- Visual check in both light and dark mode at 1440px and 768px widths.

## Open questions

- Whether to also produce 1× variants for mobile (Astro emits responsive
  variants automatically, so probably not needed).
- Whether the FAQ and Coverage pages need a hero at all, or if a sidebar
  illustration would read better. Default to "yes, hero" for consistency
  with the Overview page anchor pattern.
