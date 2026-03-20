# Phase 8: Fog-of-War - Research

**Researched:** 2026-03-20
**Domain:** Client-side conditional rendering, React/Zustand game state, UI-only fog-of-war
**Confidence:** HIGH

## Summary

Phase 8 is a pure UI modification phase — no new dependencies, no server changes, no new components. The implementation modifies 3 existing components (Piece.tsx, BattleReveal.tsx, page.tsx) to hide enemy piece ranks behind a "?" symbol and reveal them only when `gameStatus === 'finished'`. The codebase already has all the infrastructure needed: `piece.owner` distinguishes own vs enemy, `playerSide` from roomStore identifies the current player, and `gameStatus` drives phase-aware rendering.

The fog logic is entirely client-side: each Piece component checks if the piece belongs to the opponent, and if so, renders "?" instead of the rank symbol. This applies during all phases (deploying, countdown, playing). At game over, either a store-level mutation or a component-level `gameStatus === 'finished'` check triggers the reveal.

**Primary recommendation:** Use a component-level `isFogged` boolean derived from `piece.owner !== playerSide && gameStatus !== 'finished'` — no store mutations needed, single source of truth, clean reset on rematch.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x (Next.js 14) | Component rendering, conditional display | Already in project |
| Zustand | 4.x | `gameStatus`, `playerSide` state access | Already in project |
| Tailwind CSS | 3.x | Styling (`text-xs font-bold`, colors) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | — | — | Phase 8 requires zero new dependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Component-level fog check | Store-level `revealed` flag mutation | Store mutation risks stale state on rematch; component check is stateless and auto-resets |
| CSS-only fog (content property) | Conditional React rendering | CSS can't access Zustand state; React conditional is the correct layer |

**Installation:**
```bash
# No installation needed — zero new dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/features/game/
├── Piece.tsx              # MODIFY: add fog conditional for "?" rendering
├── BattleReveal.tsx        # MODIFY: show "?" for defender when enemy
├── WinModal.tsx            # NO CHANGE: overlay works fine with revealed pieces behind
├── Board.tsx               # NO CHANGE: passes piece data, Piece handles fog
├── DeploymentZone.tsx      # NO CHANGE: zone visibility unchanged
└── page.tsx                # NO CHANGE (or minimal: gameStatus='finished' already triggers WinModal)
```

### Pattern 1: Derived Fog State (Recommended)
**What:** Compute `isFogged` at render time from existing store values — no mutations, no new state
**When to use:** When the fog condition is purely a function of existing state (`piece.owner`, `playerSide`, `gameStatus`)
**Example:**
```tsx
// Source: Piece.tsx — client/src/features/game/Piece.tsx
// Derive fog at render — no store mutation needed
const { playerSide } = useRoomStore();
const { gameStatus } = useGameStore();
const isEnemy = piece.owner !== playerSide;
const isFogged = isEnemy && gameStatus !== 'finished';

// Render "?" or rank symbol
const displaySymbol = isFogged ? '?' : PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase();
```

**Why this wins:** Stateless — rematch calls `resetForRematch()` which resets `gameStatus` to `'deploying'`, and fog automatically re-applies. No cleanup bugs.

### Pattern 2: Conditional Symbol in BattleReveal
**What:** Show "?" for defender in battle overlay when defender is enemy piece
**When to use:** In BattleReveal.tsx, where both attacker and defender symbols are rendered
**Example:**
```tsx
// Source: BattleReveal.tsx — client/src/features/game/BattleReveal.tsx
const { playerSide } = useRoomStore();
const isDefenderEnemy = defender.owner !== playerSide;
const defenderDisplay = isDefenderEnemy ? '?' : (PIECE_SYMBOLS[defender.type] ?? defender.type[0].toUpperCase());
```

**Why:** User sees their own piece's rank but enemy piece stays "?" during battle. Result text ("Attacker Wins!") remains visible so outcome is clear.

### Anti-Patterns to Avoid
- **Mutating `piece.revealed` in the store:** Creates cleanup complexity on rematch; component-level derivation is simpler and auto-resets
- **Adding a new `fogOfWar` Zustand field:** Redundant — `gameStatus` and `playerSide` already encode the fog condition
- **Server-side filtering for v1:** Out of scope per user decision; client-side is sufficient for casual play
- **Opacity changes for fogged pieces:** User decided fully opaque — `opacity-60` is removed, not repurposed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fog state management | Custom fog reducer/context | Derived `isFogged` boolean from existing stores | Existing `gameStatus` + `playerSide` already encode the condition |
| Piece symbol lookup | Inline rank-to-symbol mapping | Existing `PIECE_SYMBOLS` constant | Already defined in Piece.tsx, BattleReveal.tsx, WinModal.tsx |
| Game-over detection | Custom game-over listener | Existing `gameStatus === 'finished'` | Already set by `game:over` socket handler in page.tsx |

**Key insight:** The fog-of-war is a *presentation concern*, not a *state concern*. All information needed to determine fog visibility already exists in Zustand stores. No new state, no new events, no new server logic.

## Common Pitfalls

### Pitfall 1: `piece.revealed` Flag Confusion
**What goes wrong:** The `Piece` interface has a `revealed: boolean` field. Developers might try to use it for fog, but it's set to `false` on deploy and never updated for enemy pieces in the current code.
**Why it happens:** The field name `revealed` semantically suggests fog-of-war, but it's unused infrastructure.
**How to avoid:** Ignore `piece.revealed` entirely. Use `gameStatus === 'finished'` as the reveal trigger. The user explicitly decided this flag is "effectively bypassed" for Phase 8.
**Warning signs:** Code that sets `piece.revealed = true` for enemy pieces — this adds unnecessary mutation complexity.

### Pitfall 2: Board Rotate-180 Interaction
**What goes wrong:** The board uses `rotate-180` CSS class for red player perspective (Phase 7). Each Piece is counter-rotated. Fogged "?" must display correctly under both rotation states.
**Why it happens:** The counter-rotation wrapper in Board.tsx (`<div className={playerSide === 'red' ? 'rotate-180' : ''}>`) applies to Piece. "?" is just text — it counter-rotates fine.
**How to avoid:** No changes needed — the existing counter-rotation pattern handles fogged pieces identically to revealed pieces. "?" is a text symbol, same as "Col" or "5★".
**Warning signs:** Adding extra rotation logic for fogged pieces — unnecessary.

### Pitfall 3: BattleReveal Defender Identity
**What goes wrong:** In BattleReveal, both attacker and defender pieces are rendered. If the *attacker* is the enemy (opponent moved into your piece), the attacker should show "?" too.
**Why it happens:** The battle overlay shows both pieces. The user decision says "enemy piece shows '?' during battle" — this applies to whichever side is the enemy from the current player's perspective.
**How to avoid:** Check `piece.owner !== playerSide` for *both* attacker and defender in BattleReveal, not just defender.
**Warning signs:** Only fogging the defender — if opponent attacks you, their attacker piece would reveal rank.

### Pitfall 4: Rematch State Reset
**What goes wrong:** After game-over reveal, starting a rematch must re-apply fog. If using store-level `revealed` mutations, forgetting to reset them causes fog to leak into the next game.
**Why it happens:** `resetForRematch()` in gameStore resets board to empty and gameStatus to 'deploying'. If `revealed` flags were mutated on game-over, they persist.
**How to avoid:** Use component-level derived fog (`gameStatus !== 'finished'`). The status reset in `resetForRematch()` automatically re-applies fog.
**Warning signs:** Fog not appearing after rematch — leaked `revealed` flags from previous game.

## Code Examples

### Piece.tsx: Fog Rendering
```tsx
// Source: client/src/features/game/Piece.tsx (current code, lines 32-68)
// MODIFICATION: replace symbol derivation and remove opacity-60

import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';

export default function Piece({ piece, position, onClick, isSelected, onInvalidClick }: PieceProps) {
  const { playerSide } = useRoomStore();
  const { gameStatus } = useGameStore();

  const isFogged = piece.owner !== playerSide && gameStatus !== 'finished';
  const symbol = isFogged ? '?' : (PIECE_SYMBOLS[piece.type] ?? piece.type[0].toUpperCase());

  // In className: remove `!piece.revealed ? 'opacity-60' : ''` line
  // Fogged pieces are fully opaque per user decision
}
```

### BattleReveal.tsx: Fogged Defender (and Attacker)
```tsx
// Source: client/src/features/game/BattleReveal.tsx (current code, lines 59-60)
// MODIFICATION: conditional symbol for enemy pieces

import { useRoomStore } from '@/store/roomStore';

export default function BattleReveal({ attacker, defender, ... }: BattleRevealProps) {
  const { playerSide } = useRoomStore();

  const attackerSymbol = attacker.owner !== playerSide
    ? '?'
    : (PIECE_SYMBOLS[attacker.type] ?? attacker.type[0].toUpperCase());

  const defenderSymbol = defender.owner !== playerSide
    ? '?'
    : (PIECE_SYMBOLS[defender.type] ?? defender.type[0].toUpperCase());

  // Result text ("Attacker Wins!") stays unchanged — per user decision
}
```

### Game-Over Reveal: No Explicit Code Needed
```tsx
// Source: client/src/app/game/[roomId]/page.tsx (line 414)
// When gameStatus === 'finished', Piece components automatically show true ranks
// because isFogged = piece.owner !== playerSide && gameStatus !== 'finished'
// evaluates to false when gameStatus is 'finished'

// No store mutation, no explicit reveal logic — derived state handles it
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `piece.revealed` flag mutation | Derived `isFogged` boolean | Phase 8 (this phase) | No cleanup bugs, auto-reset on rematch |
| Opacity-60 for unrevealed pieces | Full opacity with "?" symbol | Phase 8 | Consistent fog appearance, no dimming |
| Rank visible during battle | "?" during battle for enemy | Phase 8 (per user decision) | Maintains strategic mystery |

**Deprecated/outdated:**
- `piece.revealed` field in `Piece` interface: Not used for fog in Phase 8. Kept in types but effectively dead code. May be repurposed in v2 for server-side filtering.

## Open Questions

1. **BattleReveal attacker fog direction**
   - What we know: If opponent moves into YOUR piece, the attacker is enemy — should show "?"
   - What's unclear: Whether the current BattleReveal attacker/defender distinction handles this correctly
   - Recommendation: Check `piece.owner !== playerSide` for both attacker and defender (see Pitfall 3)

2. **`piece.revealed` flag — cleanup or ignore?**
   - What we know: Field exists in types, set to `false` on deploy, never updated for enemy
   - What's unclear: Whether to remove it from types or leave as dead code
   - Recommendation: Leave it — removing it from the type interface is a separate cleanup task, not part of fog-of-war

3. **Deployment phase enemy pieces**
   - What we know: Enemy pieces show "?" during deployment per user decision
   - What's unclear: At what point do enemy pieces appear on the board during deployment? (They deploy simultaneously, board is shared)
   - Recommendation: Fog applies from the moment pieces appear — `gameStatus === 'deploying'` triggers fog for enemy pieces

## Validation Architecture

> nyquist_validation is true in config.json — include this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (ts-jest) + Node test environment |
| Config file | `server/jest.config.js` |
| Quick run command | `cd server && npx jest --testPathPattern=fog -x` |
| Full suite command | `cd server && npx jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOGWAR-01 | Enemy pieces display "?" during playing phase | unit | `cd client && npx jest --testPathPattern=fog -x` (Wave 0) | ❌ Wave 0 |
| FOGWAR-02 | Own pieces always show rank symbol | unit | `cd client && npx jest --testPathPattern=fog -x` (Wave 0) | ❌ Wave 0 |
| FOGWAR-03 | Enemy shows "?" during BattleReveal (no rank reveal) | unit | `cd client && npx jest --testPathPattern=fog -x` (Wave 0) | ❌ Wave 0 |
| FOGWAR-04 | All pieces reveal true ranks on game-over | unit | `cd client && npx jest --testPathPattern=fog -x` (Wave 0) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Manual visual verification (UI component changes)
- **Per wave merge:** `cd client && npx jest --testPathPattern=fog -x` (if test infrastructure exists)
- **Phase gate:** Visual inspection + all FOGWAR requirements confirmed via gameplay

### Wave 0 Gaps
- [ ] No client-side test framework configured (no jest.config in client/, no vitest.config.*)
- [ ] No `client/tests/fog.test.tsx` — needed for automated FOGWAR validation
- [ ] Client package.json has no test script — needs Jest + @testing-library/react setup
- [ ] Alternative: rely on manual testing for this pure-UI phase (acceptable given simplicity)

*(Note: This is a pure UI phase with simple conditional rendering. Manual verification via gameplay testing may be more practical than setting up client-side test infrastructure from scratch. The server-side Jest tests cover game logic but not UI rendering.)*

## Sources

### Primary (HIGH confidence)
- `client/src/features/game/Piece.tsx` — Current rendering, `opacity-60` pattern, `PIECE_SYMBOLS` constant
- `client/src/features/game/BattleReveal.tsx` — Battle animation, defender/attacker symbol rendering
- `client/src/store/gameStore.ts` — `gameStatus` field, `setWinner`, `resetForRematch`
- `client/src/store/roomStore.ts` — `playerSide` field
- `client/src/types/index.ts` — `Piece` interface with `revealed: boolean` field
- `client/src/app/game/[roomId]/page.tsx` — `game:over` handler, `gameStatus === 'finished'` checks
- `client/src/features/game/Board.tsx` — rotate-180 counter-rotation pattern

### Secondary (MEDIUM confidence)
- `08-CONTEXT.md` — User decisions on fog display style, timing, BattleReveal behavior, game-over reveal

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing React/Zustand/Tailwind
- Architecture: HIGH — simple conditional rendering, verified against codebase
- Pitfalls: HIGH — all pitfalls identified from reading actual component code

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable — React conditional rendering patterns don't change)
