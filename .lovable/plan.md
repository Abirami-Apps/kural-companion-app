## What I measured

Loaded `/?k=222` in headless Chromium at six viewports and compared page scroll height to viewport height:

| Viewport | Fits? | Overflow |
|---|---|---|
| Desktop 1440x900 | yes | 0 |
| Tablet landscape 1024x768 | yes | 0 |
| Tablet portrait 768x1024 | no | +87px |
| Mobile portrait 393x825 | no | +269px |
| Mobile landscape 825x393 | no | +678px |
| Small landscape 667x375 | no | +736px |

Only the two-column (`lg:`) layouts fit. Every stacked layout overflows: the keypad and transport row fall below the fold, so on a phone in portrait the play button isn't visible without scrolling, and in landscape only the header and verse card are on screen.

## Cause

`AppLayout` uses `min-h-[100dvh]` with `flex-col`, but the player's two blocks each size to content:
- The verse section has generous fixed padding, an always-on 28-unit meaning block, and fixed heading/badge spacing.
- The controls rail stacks readout + hint + recents + seek + 4-row keypad + transport at fixed sizes with no height budget.

The `lg:` breakpoint (1024px) is the only thing that switches to side-by-side, so tablet portrait and all phone landscape widths below 1024px stay stacked and overflow.

## Plan

1. **Switch to a height-aware two-column rule** in `src/pages/Index.tsx`: use side-by-side whenever the viewport is short and wide (landscape) rather than only at `lg` width — add a `landscape:`/short-height variant in `tailwind.config.ts` (e.g. `(orientation: landscape) and (max-height: 560px)`) so phones and small tablets in landscape get the verse-left / controls-right layout that already fits.

2. **Give the controls rail a height budget** in `src/pages/Index.tsx` and `src/components/player/Keypad.tsx`: make key height, gaps and readout size scale off viewport height (`clamp` on `vh`) instead of fixed rem, and cap the rail at a fraction of the screen in stacked mode so the transport row is always visible.

3. **Make the verse section the flexible element**: it already has `flex-1 min-h-0 overflow-y-auto`; tighten its vertical padding, cap the meaning block by available height instead of a fixed `max-h-28`, and let it be the only scrollable region so the page itself never scrolls.

4. **Trim chrome on short screens**: reduce header height/logo scale and hide the footer when viewport height is small, in `src/components/layout/AppHeader.tsx` and `AppFooter.tsx`.

5. **Preserve the 4/3 word rule**: `FitLine` stays as-is; verify after changes that both lines still render unwrapped at every viewport and at font scale 3x.

6. **Re-verify** with the same six-viewport script plus the max font scale, confirming `scrollHeight === innerHeight` everywhere and screenshotting each state.

## Technical notes

No changes to audio, data, or player logic — this is layout and CSS only. New responsive variants go in `tailwind.config.ts`; sizing tokens stay semantic.
