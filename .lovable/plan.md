# Thirukkural Player — UX & UI Upgrade Plan

Goal: keep the app radically minimal, but make it feel crafted, reliable, and effortless in both orientations.

## 1. Fix the core interaction friction
- **Smarter auto-play timing**: 700 ms fixed delay feels slow for 4-digit entries and fast for 1-digit ones. Use ~1000 ms while the entry could still grow, but fire instantly when the entry can no longer be extended (e.g. any 4-digit value, or values where appending a digit exceeds 1330).
- **Visible countdown**: replace the "Playing shortly…" text with a thin progress ring/underline on the readout that drains during the debounce, so the auto-play never feels like a surprise. Tapping the play button cancels the wait and loads immediately.
- **Audio loading state**: currently there is no feedback between pressing a number and sound starting. Add a spinner state on the play button (`loading → playing`) driven by `waiting`/`canplay` events, plus a quiet inline error ("Audio unavailable — showing verse") when the file 404s instead of silently staying paused.
- **Stop autoplay chaining at the end**: `onEnded` advancing to the next kural should be an explicit, toggleable "Continuous play" state, not silent default behaviour.

## 2. Layout: one composition that works everywhere
Move from `portrait/landscape` Tailwind variants to a single responsive grid, which also fixes tablets and desktop (currently landscape forces a 350 px rail even on a 1200 px screen).

```text
Small / portrait          Wide / landscape & desktop
┌──────────────┐          ┌───────────────┬──────────┐
│  header      │          │   header      │  readout │
│  verse card  │          │   verse card  │  keypad  │
│  (scrolls)   │          │   meaning     │  transport│
├──────────────┤          │               │          │
│ readout      │          │               │          │
│ keypad       │          └───────────────┴──────────┘
│ transport    │           content column max-w-2xl, centered
└──────────────┘
```
- Verse column is the only scroll area; controls are pinned and never clipped.
- Respect safe areas (`env(safe-area-inset-*)`) for iOS/Capacitor notches and home indicator.
- Cap keypad width (~320 px) and center it, so it doesn't stretch awkwardly on tablets.

## 3. Visual craft (still minimal)
- **Typography hierarchy**: verse in Tamil at a large, generous line height as the single hero element; chapter/section as small caps above; meaning in a lighter, clearly secondary tone with a subtle divider rather than floating text.
- **Depth over decoration**: one soft ambient glow behind the verse card, a single gold hairline, no competing gradients. Remove the extra card border noise in the control rail.
- **Keypad refinement**: bigger touch targets (min 56 px), light haptic-style press feedback, subtle key-press ripple, and a distinct treatment for `C` vs digits vs shuffle so the three roles read instantly.
- **Motion discipline**: one shared transition curve; verse cross-fade + 6 px rise only. Honour `prefers-reduced-motion`.
- **Dark/light**: verify both themes on the navy/cream/gold tokens; ensure contrast passes AA for the muted meaning text.

## 4. Discoverability without clutter
- **Empty-first hint**: on first visit show a one-line ghost hint in the readout ("Type 1–1330") that disappears permanently after the first entry (localStorage).
- **Recently played** (optional, small): a single row of up to 5 number chips above the keypad for instant re-access.
- **Favourites**: a heart on the verse card, stored locally, reachable from a compact chip row. Keeps the app one-screen — no new navigation.
- **Share/copy**: one icon that copies the kural text + number; deep-link support via `/#/kural/123` so a shared link opens directly.

## 5. Robustness
- **Deep links & state**: sync current kural number into the URL so refresh/back restores it.
- **Preload the neighbours**: prefetch next/previous audio so skipping is instant.
- **Media Session API**: lock-screen / headphone controls with kural title, chapter and artwork — big perceived-quality win on mobile.
- **Offline-friendly**: verse text is already bundled JSON, so the app should render fully without network; only audio degrades.
- **Accessibility**: `aria-live` on the verse region, real button labels, full keyboard operation (already partly there), visible focus rings.

## Technical notes
- All work stays in `src/pages/Index.tsx` (split into `VerseDisplay`, `Keypad`, `Transport`, `useKuralPlayer` hook), plus token tweaks in `src/index.css`.
- No backend or data changes; kural data and audio URLs stay as-is.
- Suggested order: (1) layout + player hook refactor, (2) auto-play/loading feedback, (3) visual polish, (4) Media Session + deep links, (5) favourites/recents.

Tell me if you want the full set or just phases 1–3.
