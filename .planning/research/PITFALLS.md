# Pitfalls Research: Game of the Generals

## Critical Mistakes to Avoid

### 1. Client-Side Game Logic
**Warning signs:** Game works when server is down, different results on client vs server  
**Prevention:** All game rules enforced server-side; client only sends intent  
**Phase:** Phase 2 (Game Core)

---

### 2. State Synchronization Issues
**Warning signs:** Board different on each client, moves not appearing  
**Prevention:** Server broadcasts full board state after every action  
**Phase:** Phase 2 (Game Core)

---

### 3. Reconnection Handling
**Warning signs:** Players kicked after brief disconnect  
**Prevention:** Socket auto-reconnection, preserve room state  
**Phase:** Phase 1 (Foundation)

---

### 4. AI Performance
**Warning signs:** Bot takes >5 seconds to move  
**Prevention:** 
- Limit search depth (3 ply for MVP)
- Implement move ordering (captures first)
- Add time limit to search
**Phase:** Phase 4 (AI)

---

### 5. Race Conditions
**Warning signs:** Two players move simultaneously, conflicting results  
**Prevention:** Server processes moves sequentially; queue if needed  
**Phase:** Phase 2 (Game Core)

---

### 6. Missing Win Detection
**Warning signs:** Game never ends despite clear winner  
**Prevention:** Check all win conditions after every move  
**Phase:** Phase 3 (Game Flow)

---

### 7. Piece Rank Confusion
**Warning signs:** Wrong piece wins battle  
**Prevention:** Clear rank definitions; test all piece matchups  
**Phase:** Phase 2 (Game Core)

---

### 8. Deployment Zone Validation
**Warning signs:** Players place pieces outside allowed area  
**Prevention:** Strict coordinate validation against deployment zone  
**Phase:** Phase 2 (Game Core)

---

*Generated: 2026-03-18*
