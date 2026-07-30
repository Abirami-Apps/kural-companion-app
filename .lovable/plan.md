## Goal
Refresh the player with a cleaner, modern-minimal look, bring in the brand logo and app icon, and make typing a kural number play it automatically (no GO press).

## 1. Brand assets
- Download `https://abirami.app/logo.png` and `https://abirami.app/icon.svg` into the project (logo into `src/assets`, icon copied to `public/favicon.svg`).
- Replace the default favicon link in `index.html` with the SVG icon and delete `public/favicon.ico`.
- Add a small logo lockup at the top of the display panel (logo mark + "திருக்குறள் / Thirukkural" wordmark), sized subtly so it doesn't crowd the verse.

## 2. Auto-play on entry
- Remove the GO key requirement: after each digit press, debounce ~700ms and if the entered number is valid (1–1330), load it and start playback automatically.
- Typing another digit inside the window cancels the pending load, so 1→13→130 resolves to 130 only.
- Replace the GO key with a Clear (C) key; backspace stays. Pressing Enter on a physical keyboard still loads immediately.
- Add physical keyboard support: digits, Backspace, Enter, space to play/pause.

## 3. Visual refresh (frontend only)
- Soften the palette: keep navy/cream/gold but move to a calmer surface hierarchy — subtle gradient background, one elevated card for the verse, flatter control panel.
- Verse card: remove the ornate ✦ frame, use a thin gold hairline border, generous spacing, larger Tamil line-height, meaning in a muted block below.
- Keypad: rounded-square keys with soft press feedback, consistent gaps, larger touch targets, monospace digital readout kept but toned down (less neon glow).
- Transport row: single prominent circular play button, quieter prev/next.
- Landscape: verse left, control column right with the logo pinned top-left; portrait: logo header, verse, controls stacked. Both use full-height flex with no page scroll.

## Technical notes
- All colors added/adjusted as HSL tokens in `src/index.css` and `tailwind.config.ts`; no hardcoded color utilities in components.
- Files touched: `index.html`, `src/index.css`, `src/pages/Index.tsx`, `tailwind.config.ts`, plus new asset files. No data or business-logic changes.
