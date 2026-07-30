## Goal

Turn the player into a proper subscribe-and-use app shell: header + footer navigation, a user-controlled appearance system (theme presets, font size, high contrast), full keyboard support, and screen-reader labels on every control — without touching the verse line-break logic.

## 1. Verse line breaks (protect existing behaviour)

The kural text in `kurals.json` already ships with a hard `\n` between the 4-word first line and the 3-word second line, and `VerseDisplay` renders it with `whitespace-pre-line`. This stays exactly as is: no re-wrapping, no `text-balance` on the verse, no CSS that could reflow it. Font-size scaling will shrink text rather than allow a wrap, and the verse container gets `overflow-x-auto` on very narrow screens so the two-line structure survives.

## 2. Appearance system (theme presets + accessibility)

New `ThemeProvider` (React context + `localStorage`, applied as classes on `<html>`):

- **Theme presets**: Classic (navy/cream/gold — current), Palm Leaf (olive/parchment), Midnight (dark), Sepia (warm paper). Each preset is a `[data-theme="..."]` block of HSL tokens in `index.css`; no component hardcodes colors.
- **High contrast**: `[data-contrast="high"]` overrides — pure black/white bases, AAA-level foreground contrast, thicker 2px borders, always-visible focus rings.
- **Font size**: 4 steps (Small / Default / Large / Extra Large) driven by a `--font-scale` CSS variable that all text sizes derive from, so verse, meaning, keypad and readout scale together.
- **Reduced motion**: respects the OS setting (already partly in place) plus a manual toggle.

Controls live in an **Appearance panel** (shadcn Sheet/Popover) reachable from both the header settings icon and the footer, with swatch buttons for presets, A−/A+ font stepper, and switches for high contrast / reduced motion.

## 3. Header and footer

- **Header** (sticky, safe-area aware): logo lockup on the left — logo bumped to `h-10 sm:h-12 lg:h-14` responsive sizing with the Tamil/English wordmark; right side has nav (Home, Favourites, Chapters), a Pricing/Subscribe button, Login/Account, and the appearance settings icon. Collapses into a shadcn Sheet drawer menu on mobile with the same items, all lucide icons: `Home`, `Heart`, `BookOpen`, `Sparkles` (Pricing), `User`, `Settings2`.
- **Footer**: compact bar with quick appearance controls (theme swatches + A−/A+), plus links to Pricing, Login, and About/Privacy placeholders.
- Layout becomes `AppLayout` (header / `<main>` / footer) wrapping routes in `App.tsx`; the player fills the remaining height so the portrait and landscape compositions stay clean and scroll-free.
- New lightweight pages for the menu items that don't exist yet: `/favourites` (from saved favourites) and `/chapters` (adhikaram list → kural). Existing `/subscribe` and `/login` are reused.

## 4. Accessibility pass on the player

- `aria-label` on every control: keypad digits ("Digit 3"), clear, backspace, play/pause (state-aware), prev, next, shuffle, continuous toggle, seek slider (with `aria-valuetext` as m:ss), favourite, share.
- Number readout as `role="status"` + `aria-live="polite"` announcing "Kural 104 of 1330"; verse region announces chapter + verse on change.
- Full keyboard navigation: digits 0–9, Backspace, Escape (clear), Enter (load now), Space (play/pause), ←/→ seek 5s, ↑/↓ prev/next kural, `?` opens a shortcuts dialog. Visible `focus-visible` rings everywhere; a skip-to-player link at the top.
- Tap targets ≥44×44px, single `<main>` in the layout, one `<h1>` per page.

## 5. Seven-segment readout font

Self-hosted DSEG7-style font (`@font-face`, woff2 in `src/assets/fonts`) applied to the number display with a dimmed "8888" ghost layer behind the active digits for the authentic LCD look, colored via theme tokens so it adapts to every preset and to high contrast. Falls back to the current monospace if the font fails to load.

## Technical notes

- Files added: `src/components/theme/ThemeProvider.tsx`, `AppearancePanel.tsx`, `src/components/layout/AppHeader.tsx`, `AppFooter.tsx`, `AppLayout.tsx`, `src/pages/Favourites.tsx`, `src/pages/Chapters.tsx`, `src/components/player/ShortcutsDialog.tsx`.
- Files changed: `index.css` (theme preset blocks, contrast overrides, font-scale, `@font-face`), `tailwind.config.ts`, `App.tsx` (layout route + new routes), `Index.tsx`, `Keypad.tsx`, `Transport.tsx`, `VerseDisplay.tsx`, `useKuralPlayer.ts` (keyboard handlers).
- No backend work in this pass — subscription gating stays as the existing `/subscribe` page; say the word if you want Cloud auth + real plan gating wired next.
