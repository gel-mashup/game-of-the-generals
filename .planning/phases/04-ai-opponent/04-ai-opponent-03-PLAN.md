---
phase: 04-ai-opponent
plan: 03
type: execute
wave: 2
depends_on:
  - 04-ai-opponent-02
files_modified:
  - client/src/app/game/[roomId]/page.tsx
autonomous: true
requirements:
  - AI-04
user_setup: []

must_haves:
  truths:
    - "Bot thinking overlay appears when bot:thinking-start received"
    - "Bot thinking overlay disappears when bot:thinking-end received"
    - "Overlay is board-centered, text-only, non-blocking"
  artifacts:
    - path: "client/src/app/game/[roomId]/page.tsx"
      provides: "Bot thinking indicator UI"
      contains: "botThinking state, bot:thinking-start, bot:thinking-end"
  key_links:
    - from: "client/src/app/game/[roomId]/page.tsx"
      to: "socket"
      via: "socket.on('bot:thinking-start') and socket.on('bot:thinking-end')"
      pattern: "bot:thinking"
    - from: "BotThinkingOverlay"
      to: "Board"
      via: "absolute overlay inside board container"
      pattern: "absolute.*inset-0"
---

<objective>
Add bot thinking indicator to the client game page. Shows a board-centered text overlay "Bot is thinking..." during bot computation. Uses socket events bot:thinking-start (show) and bot:thinking-end (hide).
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/app/game/[roomId]/page.tsx
@client/src/features/game/BattleReveal.tsx
@client/src/features/game/WinModal.tsx
</context>

<interfaces>
<!-- Client game page structure (from page.tsx) -->
```tsx
// Board container (line ~370-407):
<div className="relative max-w-3xl w-full">
  <DeploymentZone ... />
  <Board ... />
  {battleOutcome && (
    <div className="absolute inset-0">
      <BattleReveal ... />
    </div>
  )}
  {gameStatus === 'finished' && winner !== null && (
    <WinModal ... />
  )}
</div>

// Socket useEffect cleanup pattern (line ~238-252):
socket.off('bot:auto-deploy');
return () => {
  socket.off('piece:deployed', handlePieceDeployed);
  // ... other offs
};
```

<!-- Existing overlay patterns to follow -->
BattleReveal: absolute inset-0 overlay with centered content, z-40+
WinModal: absolute inset-0 bg-black/60 backdrop-blur-sm, z-40+
Countdown: fixed inset-0 bg-black/60 backdrop-blur-sm, z-40
```

Thinking indicator style from CONTEXT:
- Text overlay, board overlay (like WinModal/BattleReveal)
- Text: "Bot is thinking..."
- Simple text, no depth indicator
- Removed when bot makes its move
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add botThinking state and socket listeners</name>
  <files>client/src/app/game/[roomId]/page.tsx</files>
  <action>
    Modify client/src/app/game/[roomId]/page.tsx:

    **1. Add botThinking state** (add near existing state declarations, around line 40):
    ```typescript
    const [botThinking, setBotThinking] = useState(false);
    ```

    **2. Add socket listeners for bot thinking events** inside the socket useEffect:
    
    Find the `socket.on('bot:auto-deploy', ...)` handler (around line 233-236) and AFTER it, add:
    ```typescript
    // AI-04: Bot thinking indicator
    socket.on('bot:thinking-start', () => setBotThinking(true));
    socket.on('bot:thinking-end', () => setBotThinking(false));
    ```

    **3. Add cleanup for bot thinking listeners** in the useEffect return:
    
    Find `socket.off('bot:auto-deploy')` in the cleanup function (line 251) and ADD AFTER it:
    ```typescript
    socket.off('bot:thinking-start');
    socket.off('bot:thinking-end');
    ```

    **4. Add botThinking to the useEffect dependency array** (around line 253-257):
    
    Add `setBotThinking` to the dependency array:
    ```typescript
  }, [
    socket, clearRoom, setBoard, setGameStatus, setTurn,
    setOpponentReady, setCountdownSeconds, setBattleOutcome,
    setWinner, resetForRematch, setScores, setOpponentWantsRematch, setIWantRematch,
    setBotThinking,
  ]);
    ```
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>botThinking state exists, bot:thinking-start sets to true, bot:thinking-end sets to false, cleanup registered</done>
</task>

<task type="auto">
  <name>Task 2: Add thinking overlay to game page</name>
  <files>client/src/app/game/[roomId]/page.tsx</files>
  <action>
    Add the thinking overlay inside the board container div, AFTER the WinModal block (before closing `</div>` of relative container):

    **Find this section in the board container (around line 407):**
    ```tsx
        {/* Win Modal overlay — shown when game is finished */}
        {gameStatus === 'finished' && winner !== null && (
          <WinModal ... />
        )}
      </div>
    ```

    **Replace with:**
    ```tsx
        {/* Win Modal overlay — shown when game is finished */}
        {gameStatus === 'finished' && winner !== null && (
          <WinModal ... />
        )}

        {/* AI-04: Bot thinking indicator — board overlay */}
        {botThinking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-40 pointer-events-none">
            <p className="text-white text-xl font-medium animate-pulse">
              Bot is thinking...
            </p>
          </div>
        )}
      </div>
    ```

    **Style notes:**
    - `absolute inset-0` — covers the entire board container
    - `flex items-center justify-center` — centers content
    - `bg-black/30 backdrop-blur-sm` — semi-transparent dark overlay
    - `z-40` — above board but below modals (WinModal uses its own z)
    - `pointer-events-none` — doesn't block clicks on board
    - `animate-pulse` — subtle animation matching countdown style
    - Simple text "Bot is thinking..." per CONTEXT locked decision
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>Thinking overlay renders when botThinking=true, hidden when false. Overlay covers board without blocking interaction.</done>
</task>

<task type="auto">
  <name>Task 3: Verify client TypeScript compilation</name>
  <files>client/src/app/game/[roomId]/page.tsx</files>
  <action>
    Run TypeScript compiler to verify no type errors:
    
    ```bash
    cd client && npx tsc --noEmit 2>&1
    ```
    
    Fix any type errors. Common issues:
    - botThinking state not declared
    - setBotThinking not in dependency array
    - Missing cleanup registrations
  </action>
  <verify>
    <automated>cd client && npx tsc --noEmit 2>&1</automated>
  </verify>
  <done>Client TypeScript compiles with zero errors. Bot thinking indicator fully integrated.</done>
</task>

</tasks>

<verification>
- cd client && npx tsc --noEmit → zero errors
- No new dependencies introduced
</verification>

<success_criteria>
- botThinking state exists and toggles on socket events
- Overlay appears during bot computation (bot:thinking-start)
- Overlay disappears when bot moves (bot:thinking-end)
- Overlay is text-only, board-centered, non-blocking
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/phases/04-ai-opponent/04-ai-opponent-03-SUMMARY.md`
</output>
