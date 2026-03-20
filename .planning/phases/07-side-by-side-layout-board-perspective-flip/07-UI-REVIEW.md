# Phase 7 — UI Review

**Audited:** 2026-03-20
**Baseline:** 07-UI-SPEC.md (approved design contract)
**Screenshots:** captured (desktop 1440x900, mobile 375x812, tablet 768x1024)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All copy matches UI-SPEC contract exactly; no generic labels |
| 2. Visuals | 3/4 | Clear hierarchy and focal points; missing aria-labels on icon-like elements |
| 3. Color | 3/4 | Board/sidebar/page colors match spec; accent used 11 times (borderline on reserved-for list) |
| 4. Typography | 2/4 | 7 distinct font sizes vs 4 in contract; text-5xl/6xl/3xl are undeclared |
| 5. Spacing | 4/4 | Strict 4px-multiple grid; no arbitrary values; consistent scale usage |
| 6. Experience Design | 3/4 | Loading/error/disabled states present; no empty state messaging; no auto-deploy confirmation |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Typography: Undeclared font sizes (text-5xl, text-6xl, text-3xl, text-xl)** — The UI-SPEC declares 4 font roles (12px, 14px, 18px, 24px). The implementation uses 7 distinct sizes including text-5xl (WinModal emoji), text-6xl (countdown), text-3xl (WinModal heading), and text-xl (bot thinking). This creates visual noise and breaks the typographic hierarchy contract. — **Fix:** Map countdown to `text-4xl` (declared Display size), WinModal emoji to `text-3xl` or smaller, bot thinking to `text-lg` (Heading size), WinModal heading to `text-2xl` (Display size). Keep all sizes within the 4-role system.

2. **Experience Design: No empty state messaging** — When no pieces are deployed yet, there's no guidance text. The sidebar shows "0/21 pieces placed" but no prompt like "Select a piece below to begin deploying." If a user opens the palette with all pieces deployed, no visual feedback confirms completion beyond the counter. — **Fix:** Add conditional helper text below the sidebar header: `{totalDeployed === 0 ? "Select a piece below to begin" : totalDeployed === 21 ? "All pieces placed — ready to go!" : ""}`.

3. **Experience Design: Auto-Deploy has no confirmation** — The Auto-Deploy button triggers random piece placement with no undo or confirmation. This is a destructive-ish action (overwrites any manual placement work). — **Fix:** Add a confirmation state similar to Leave: first click shows "Confirm Auto-Deploy?" with a 2-second timeout, second click executes. Or add a tooltip/warning: `title="This will randomly place all remaining pieces"`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**All copywriting matches UI-SPEC contract exactly.**

Verified strings against contract:
- ✅ "Deploy Your Forces" — `DeploymentSidebar.tsx:45`, `page.tsx:465`
- ✅ "{N}/21 pieces placed" — `DeploymentSidebar.tsx:47`, `page.tsx:467`
- ✅ "Ready" / "Ready ✓" — `DeploymentSidebar.tsx:80`, `page.tsx:494`
- ✅ "Auto-Deploy" — `DeploymentSidebar.tsx:66`, `page.tsx:482`
- ✅ "Tap your piece to select, then tap a green square to move" — `page.tsx:442`
- ✅ "Bot is thinking..." — `page.tsx:433`
- ✅ "Waiting for game to start..." — `page.tsx:503`
- ✅ "{N}…" / "Go!" countdown — `page.tsx:386`
- ✅ "Leave?" / "✕" — `page.tsx:360,365`
- ✅ Error toast with server message, auto-dismiss 4s — `page.tsx:178-179`

No generic labels found ("Submit", "Click Here", "OK", "Cancel", "Save" — grep clean).

Tier headers match contract:
- ✅ "Generals (5★)" — `PiecePalette.tsx:14`
- ✅ "Officers (4-2★)" — `PiecePalette.tsx:15`
- ✅ "Special" — `PiecePalette.tsx:16`
- ✅ "Privates (PVT)" — `PiecePalette.tsx:17`

### Pillar 2: Visuals (3/4)

**Clear visual hierarchy established; minor accessibility gaps.**

Strengths:
- Board grid is clear focal point with `shadow-2xl` and `rounded-lg`
- Gold accent (`#d4a847`) consistently signals primary actions and important info
- Sidebar glass-morphism (`backdrop-blur-md`, `bg-[rgba(30,58,95,0.5)]`) creates visual separation
- Turn indicator uses color + weight differentiation (`text-[#d4a847]` vs `text-gray-400`)
- Piece palette items have clear selected state (`ring-2 ring-[#d4a847]`) and depleted state (`opacity-40`)

Issues:
- No `aria-label` attributes on interactive elements (buttons have text content, which is acceptable, but the `✕` cancel button on leave confirm at `page.tsx:363` should have `aria-label="Cancel leave"`)
- Piece palette buttons use `title={type}` (`PiecePalette.tsx:48`) as tooltip but no `aria-label` — screen readers get the raw type string
- Score separator uses `|` character (`page.tsx:327,332`) — decorative, but not hidden from screen readers with `aria-hidden`

### Pillar 3: Color (3/4)

**Board/sidebar/page colors match contract; accent usage borderline.**

Color contract compliance:
- ✅ Page background: `bg-[#1a2e1a]` — `page.tsx:304`
- ✅ Game header: `bg-[#2d4a2d]` — `page.tsx:313`
- ✅ Board dark: `bg-[#1e3a5f]` — `Board.tsx:69`
- ✅ Board light: `bg-[#2d5a6b]` — `Board.tsx:69`
- ✅ Board border: `border-[#1e3a5f]` — `Board.tsx:53`
- ✅ Cell border: `border-[#1e3a5f]/20` — `Board.tsx:70`
- ✅ Sidebar bg: `bg-[rgba(30,58,95,0.5)]` — `DeploymentSidebar.tsx:34`
- ✅ Sidebar blur: `backdrop-blur-md` — `DeploymentSidebar.tsx:34`
- ✅ Red pieces: `bg-red-600` — `PiecePalette.tsx:52`
- ✅ Blue pieces: `bg-blue-600` — `PiecePalette.tsx:52`
- ✅ Valid move: `bg-[rgba(74,124,74,0.5)]` — `Board.tsx:72`
- ✅ Destructive: `bg-red-600` on leave button — `page.tsx:350`

Accent (`#d4a847`) usage count: 11 instances across files.

Per UI-SPEC reserved-for list:
- ✅ Deployment zone borders/glow — handled by DeploymentZone component
- ✅ Selected piece ring (`ring-2 ring-[#d4a847]`) — `PiecePalette.tsx:45`, `Piece.tsx:60`
- ✅ "Deploy Your Forces" heading — `DeploymentSidebar.tsx:45`, `page.tsx:465`
- ✅ "Ready" button background — `DeploymentSidebar.tsx:76`, `page.tsx:490`
- ✅ Room code display — `page.tsx:317`
- ✅ Countdown number — `page.tsx:385`
- ⚠️ Turn indicator "Your turn" text — `Board.tsx:49` (NOT in reserved-for list, but established pattern from Phase 6)

No hardcoded colors outside Tailwind arbitrary values. No `rgb()` function calls.

### Pillar 4: Typography (2/4)

**7 distinct font sizes used vs 4 declared in contract.**

UI-SPEC contract (4 roles):
| Role | Size | Weight | Tailwind |
|------|------|--------|----------|
| Body | 14px | 400 | `text-sm` |
| Label | 12px | 600 | `text-xs font-semibold` |
| Heading | 18px | 700 | `text-lg font-bold` |
| Display | 24px | 700 | `text-2xl font-bold` |

Actual usage (7 distinct sizes):
| Tailwind | Where | Contract Match |
|----------|-------|----------------|
| `text-xs` | Tier headers, score labels, count badges | ✅ Label |
| `text-sm` | Body text, button labels, progress, piece names | ✅ Body |
| `text-lg` | Sidebar heading, turn indicator, WinModal subheading | ✅ Heading |
| `text-xl` | Bot thinking (`page.tsx:432`) | ❌ Undeclared |
| `text-2xl` | BattleReveal (`BattleReveal.tsx:84,106`) | ✅ Display |
| `text-3xl` | WinModal heading (`WinModal.tsx:85`) | ❌ Undeclared |
| `text-5xl` | WinModal emoji (`WinModal.tsx:78`) | ❌ Undeclared |
| `text-6xl` | Countdown (`page.tsx:385`) | ❌ Undeclared |

Font weights (3 distinct — within contract):
- `font-semibold` — Label role ✅
- `font-medium` — Body emphasis ✅
- `font-bold` — Heading/Display role ✅

**Impact:** The extra sizes (text-xl, text-3xl, text-5xl, text-6xl) create visual noise outside the declared hierarchy. The countdown at `text-6xl` is especially large (48px vs 24px declared Display).

### Pillar 5: Spacing (4/4)

**Strict 8-point grid maintained; no arbitrary values.**

Spacing classes in use (from grep analysis):
- `p-4` (16px) — Most common: sidebar padding, header padding, button padding
- `px-3` (12px) — Tier header padding
- `px-4` (16px) — Button horizontal padding
- `py-2` (8px) — Button vertical padding, piece item padding
- `gap-1` (4px) — Piece palette vertical gap
- `gap-2` (8px) — Piece item internal gap, sidebar button gap
- `gap-3` (12px) — Mobile button gap
- `gap-4` (16px) — Main layout gap, header internal gap

All values are multiples of 4px (8-point grid compliant). No arbitrary `[Npx]` or `[Nrem]` spacing values found (grep clean for `\[.*px\]`).

Spacing consistency:
- Sidebar header: `p-4` matches spec "section padding: md (16px)"
- Piece items: `px-3 py-2` matches spec "item padding: px-3 py-2 (12px horizontal, 8px vertical)"
- Icon gap: `gap-2` matches spec "Gap between icon and name: gap-2 (8px)"

### Pillar 6: Experience Design (3/4)

**Core states covered; empty state and confirmation patterns missing.**

State coverage:

| State | Present | Implementation |
|-------|---------|----------------|
| Loading (bot thinking) | ✅ | `page.tsx:430-436` — overlay with pulse animation |
| Loading (countdown) | ✅ | `page.tsx:383-389` — fixed overlay with countdown |
| Error (toast) | ✅ | `page.tsx:306-310` — fixed top toast, auto-dismiss 4s |
| Disabled (Auto-Deploy) | ✅ | `DeploymentSidebar.tsx:63` — disabled when playerReady |
| Disabled (Ready) | ✅ | `DeploymentSidebar.tsx:70` — disabled when not all deployed |
| Disabled (depleted pieces) | ✅ | `PiecePalette.tsx:42` — disabled + opacity-40 |
| Empty state | ❌ | No guidance when 0 pieces deployed |
| Confirm (Leave) | ✅ | `page.tsx:347-369` — two-step confirm with ✕ cancel |
| Confirm (Auto-Deploy) | ❌ | Direct action, no confirmation or undo |
| Waiting state | ✅ | `page.tsx:501-505` — "Waiting for game to start..." |
| Win state | ✅ | WinModal overlay with scores + rematch |

Missing patterns:
1. **Empty state messaging** — No helper text when palette is fresh (0/21 deployed). User must discover they need to click a piece first.
2. **Auto-Deploy confirmation** — Triggers random placement with no warning. Consider adding `title` tooltip or confirmation step.
3. **Board flip accessibility** — No visual indicator that the board has flipped for red player. The flip is instantaneous on game start with `transition-transform duration-500` but no text like "Board flipped to your perspective" appears.

---

## Files Audited

- `client/src/app/game/[roomId]/page.tsx` (508 lines) — Main game page layout
- `client/src/features/game/DeploymentSidebar.tsx` (85 lines) — Glass-morphism sidebar
- `client/src/features/game/Board.tsx` (93 lines) — Board grid with flip
- `client/src/features/game/PiecePalette.tsx` (111 lines) — Vertical tier-grouped palette
- `client/src/features/game/Piece.tsx` — Piece rendering (spot-checked)
- `client/src/features/game/DeploymentZone.tsx` — Zone overlay (spot-checked)
- `client/src/features/game/BattleReveal.tsx` — Battle animation (spot-checked)
- `client/src/features/game/WinModal.tsx` — Win modal (spot-checked)

---

## Registry Safety

No shadcn initialization (`components.json` not found). No third-party registries. Registry audit skipped.

---

## Summary

Phase 7 delivers strong layout and interaction work: the side-by-side layout, glass-morphism sidebar, board perspective flip, and navy/teal color scheme all match the UI-SPEC contract. The piece palette vertical restructuring with tier groups is well-executed.

**Primary concern:** Typography scale deviation — 4 undeclared font sizes (text-xl, text-3xl, text-5xl, text-6xl) break the 4-role contract. This is the most impactful fix as it affects visual consistency across game states.

**Secondary concerns:** Empty state messaging and auto-deploy confirmation are UX gaps that affect first-time user experience.

**Bottom line:** Solid 19/24. Typography cleanup alone would bring this to 21/24.
