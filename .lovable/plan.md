# Kural Companion — production hardening

Verified current state: no auth/payment backend exists (no `src/integrations`, no `supabase/`); `Login.tsx` has non-functional "Send OTP" and a `// TODO: Google sign-in` button; `Subscribe.tsx` lists "English translation" as a benefit; `DebugPanel` is rendered unconditionally from `AppLayout` and is the **only** caller of `useFitGuard`; Media Session artwork points at `/icon.svg`, which does not exist in `public/` (only `favicon.svg`); `/kural/:number` is a second, independent player with its own gating.

Tamil text handling stays untouched: rendering keeps the stored newline, two source lines, one shared auto-fit font size, and no "4 words / 3 words" claims in code.

## Phase 1 — One player
- New `src/components/player/KuralPlayer.tsx` containing the whole player composition (verse, readout, keypad, transport, seek), driven by the existing `useKuralPlayer`.
- `useKuralPlayer` takes the current number from the router (`useParams` for `/kural/:number`, `useSearchParams` for `/?k=`) and navigates on change, so Back/Forward work. No manual `history` calls.
- Routes `/` , `/?k=123`, `/kural/123` all render the same component; Favourites/Chapters link to `/kural/:n`.
- Invalid number → friendly inline error + "Go to Kural 1" button.
- Prev disabled at 1; Next and continuous play stop cleanly at 1330.
- Delete the old `src/pages/KuralPlayer.tsx` page after confirming no imports remain.

## Phase 2 — Entitlements
- `src/lib/features.ts`: `subscriptionsEnabled = false` (no payment provider configured), `FREE_LIMIT = 10`.
- `src/hooks/useAuth.ts` (stub, no backend) + `src/hooks/useEntitlements.ts` exposing `canAccessKural(n)`; every route and player action uses it.
- Flag off → all 1330 Kurals playable, all paid-access claims hidden. Flag on → 1–10 free, 11+ show a locked state.
- Login page: remove dead buttons; OTP/Google/email are shown as clearly-labelled "not configured yet" states, not silent no-ops.
- Subscribe page: remove "English translation" benefit; cards state checkout is not connected until a payment provider is configured.

## Phase 3 — Desktop composition
Reading group (section · chapter · verse card · meaning · favourite/share) becomes one vertically centred stack, with Favourite/Share directly under the meaning. Card max-width capped (~46rem); control rail stays 340–390px. Meaning gets a comfortable size and token-based contrast. Portrait mobile stays stacked; landscape phones/large tablets use the split layout.

## Phase 4 — Fit & touch targets
Restore all interactive targets to ≥44×44 CSS px (undo the `short:` 36px/24px shrinks in Keypad/Transport). Fit strategy becomes: shrink type and spacing first; if a short landscape viewport still cannot fit, the control rail gets a contained, intentional scroll region instead of sub-44px controls. Safe-area insets preserved. Verified at all 11 listed viewports plus Extra Large font mode.

## Phase 5 — Dev UI out of production
`useFitGuard()` moves into `AppLayout` (production layout hook, independent of debug UI). `DebugPanel` renders only when `import.meta.env.DEV` or `?debug=1`; the bug button disappears from production.

## Phase 6 — Accessibility
`<html lang="ta">` with `lang="en"` on English-only UI regions; skip link targets `#main`; state-aware `aria-label` on every icon-only button; real labels + `aria-describedby`/`aria-invalid` error wiring on login fields; a single polite live region for Kural changes; keyboard shortcuts suppressed while typing in input/textarea/select/contenteditable or inside a dialog; visible focus rings and clear disabled states across Classic/Palm/Midnight/Sepia/High-Contrast; reduced-motion disables animation only; seek slider gets accessible name, current/total time, and `disabled` when metadata is unavailable.

## Phase 7 — Audio
Loading shown only while actually loading; Pause never shown before playback starts; failure → verse stays readable with "Audio unavailable" + Retry; play state preserved across Prev/Next; continuous stops at 1330; rapid entry cannot fire duplicate `play()` (single in-flight token); all timeouts/listeners cleared on cleanup; Media Session handlers respect boundaries and use a real existing artwork asset; prefetch clamped to 1–1330.

## Phase 8 — Branding & metadata
"Kural Companion" used consistently (header, footer, title, metadata, subscribe, login, a11y labels), with திருக்குறள் as the primary Tamil title. `index.html`: `lang="ta"`, canonical title/description, generated real OG image (1200×630) referenced once a published URL exists — otherwise the platform-injected preview is used and no Lovable generic asset is referenced; `@Lovable` twitter tag and `lovable.dev` image removed; app favicon/logo used; `theme-color` for light and dark.

## Phase 9 — Data validation
`src/lib/validateKurals.ts` (non-destructive) checking: 1330 records; IDs 1–1330 with no gaps/duplicates; required fields present; exactly one newline per Tamil text with two non-empty lines; HTTPS audio URLs; 133 chapters; the three expected section names. Separate whitespace-token report lists non-4/3 records without editing them.

## Phase 10 — Tests
Vitest (replacing the placeholder): data completeness/ID sequence, two-line preservation, URL number parsing, invalid numbers, prev/next boundaries, continuous stop at 1330, favourites persistence, corrupted-localStorage recovery, entitlement rules, number-entry timing, audio error state — with deterministic audio mocks (no CDN dependency).
Playwright: Kural 1 load, keypad entry of 1330, deep link, Back/Forward, favourite add/remove, chapter nav, theme + font-size persistence, keyboard shortcuts, high contrast, mobile portrait / phone landscape / tablet portrait / desktop layouts, no horizontal overflow, 44px touch targets, gating on and off — with audio routes stubbed.

## Final verification
Typecheck, ESLint, Vitest, Playwright, production build, screenshots at all 11 viewports, console errors, failed network requests; confirm no TODO buttons, no production debug button, and all 1330 Kurals two-line intact. Report: files changed, architecture changes, tests added, commands run, results, and what is intentionally disabled for lack of backend/payment credentials.

## Technical notes
No backend will be added: authentication, OTP, Google sign-in and checkout stay behind `subscriptionsEnabled=false` and are labelled as unconfigured. If you want real login/subscriptions, that needs Lovable Cloud plus a payment provider — say so and I'll add it as a follow-up.
