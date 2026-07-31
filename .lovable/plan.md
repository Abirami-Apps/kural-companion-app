## Part A — Verse area and keypad on tablet/mobile

### What I measured (headless Chromium, `/?k=222`)

| Viewport | Page scroll | Verse font | Verse card | Hidden overflow inside verse |
|---|---|---|---|---|
| 1440x900 | 0 | 25.5px | 171px | none |
| 1024x768 | 0 | 22.6px | 160px | none |
| 768x1024 | 0 | 25.5px | 171px | meaning clipped 7px |
| 768x825 (current) | 0 | 25.5px | 171px | **verse article clipped 130px**, meaning clipped 40px |
| 393x825 | 0 | 13.5px | 93px | meaning clipped 84px |
| 825x393 | 0 | 15.7px | 94px | meaning clipped 40px |
| 667x375 | 0 | **11px** (floor) | 82px | meaning clipped 80px |

So the page never scrolls, but that was bought by clipping: on tablet portrait the favourite/share row and part of the verse are cut off, the meaning is clipped everywhere below desktop, and on small landscape the Tamil text hits the 11px floor and is barely readable.

### Cause

The controls rail is sized first and takes a fixed stack (readout + hint + recents + seek + 4 keypad rows + transport). In stacked (portrait/small) mode the verse gets whatever is left, then `overflow-hidden` silently crops it. The verse font auto-fitter only shrinks to fit *width*, so on short screens it shrinks by height clamp until it hits the 11px floor.

### Changes

1. **Give the verse a guaranteed share of the screen** (`src/pages/Index.tsx`): in stacked mode make the verse section `flex-1` with a minimum height (~40–45vh) and cap the controls rail at ~52vh, so neither can crush the other. Remove the silent crop: the verse column becomes a fit-to-space layout, never `overflow-hidden` over real content.

2. **Compact the keypad on short/stacked screens** (`src/components/player/Keypad.tsx`): switch from a 3x4 grid to a denser layout when height is limited — smaller key height floor, tighter gaps, and merge `C`/shuffle into the readout row so the keypad is 3 rows instead of 4. This alone frees ~60–70px for the verse on phones.

3. **Fold seek + transport into one row** (`src/pages/Index.tsx`, `Transport.tsx`): on short viewports place the progress bar inline with the transport buttons instead of stacked, and drop the redundant hint line (already hidden) and duration labels to a single compact readout.

4. **Make the meaning text fit instead of clipping** (`src/components/player/VerseDisplay.tsx`): the meaning block becomes a flexible region that gets whatever height remains, with line-clamp computed from measured available height rather than fixed `line-clamp-1/2/4`. If space is genuinely tiny (landscape phone) it collapses to a one-line summary with an expand affordance rather than a half-cut paragraph.

5. **Raise the verse legibility floor**: lift the auto-fit minimum from 11px to ~14px and let the fitter reduce card padding/leading before it reduces font size. The 4-word / 3-word line split stays untouched — both lines keep one shared size and `nowrap`.

6. **Tablet portrait gets the two-column layout earlier**: at >=700px width in portrait, place verse and controls side by side (verse left, rail right) instead of stacking — that is the layout that already fits perfectly at 1024x768.

7. **Re-verify** with the same seven-viewport script plus 3x font scale: assert `doc scroll === 0` *and* no element clipping real content (`scrollHeight > clientHeight` on the verse/meaning), and screenshot each state.

---

## Part B — Sign-in plan (email + Google + mobile OTP)

### Backend
Enable Lovable Cloud (database, auth, functions — no external accounts).

- `profiles` table keyed to the auth user (display name, avatar, phone, locale), auto-created by a signup trigger, with row-level security so a user reads/updates only their own row.
- `user_roles` table with a separate role enum and a security-definer `has_role()` check — roles never live on the profile row.
- Grants for `authenticated`/`service_role` on both tables.

### Methods
1. **Email + password** — signup with email confirmation, sign-in, and a real `/reset-password` page (required, otherwise reset links just log people in).
2. **Google sign-in** — managed by Cloud Auth, one button, no external console work needed.
3. **Mobile OTP** — phone sign-in sends a 6-digit SMS code; user enters it in an OTP input to complete sign-in. This needs an SMS provider (Twilio) configured with account SID, auth token and a sending number/messaging service — I'll request those securely when we get there. Without it, phone OTP cannot send real messages.

### Frontend
- Rebuild `src/pages/Login.tsx` as a real auth screen: Email / Mobile tabs, Google button, validation with Zod, error and loading states, "check your email" confirmation state.
- New `src/pages/Signup.tsx`, `src/pages/ResetPassword.tsx`, and an OTP verify step.
- `AuthProvider` that registers the auth-state listener first and then hydrates the session; `useAuth()` exposes user, session, loading, signOut.
- Route guard for member-only pages (Favourites sync, Subscribe/manage plan); public routes stay public.
- Header shows avatar + account menu (Profile, Favourites, Subscription, Sign out) when signed in, Login/Subscribe when not.
- Favourites migrate from localStorage to the database when a user signs in, merging any local entries.

### Technical notes
Part A is CSS/layout only — no audio, data, or player-logic changes. Part B adds Cloud with the schema above; SMS OTP is blocked on Twilio credentials, everything else works without any third-party setup. Suggested order: ship Part A first, then auth.
