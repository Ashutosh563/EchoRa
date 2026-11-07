# SONORA — Developer & AI Agent Context Guide (`CODEX.md`)

This document is the single source of truth for AI agents (OpenAI Codex, Copilot, Antigravity) working on the **Sonora** codebase. Read this entire document before writing code, proposing changes, or running commands.

---

## 1. What Sonora Is

**Sonora** is an AI-powered, mood-aware music discovery application built during a hackathon. Instead of traditional genre or artist search, Sonora allows users to express vibes, visual states, and emotional transitions in natural language:
- *"Melancholic rain outside my window while writing code at 2 AM"*
- Real-time webcam facial mood capture
- Multi-stage emotional mood journeys (e.g., from *Stressed* &rarr; *Calm* &rarr; *Focused* &rarr; *Energized*)

---

## 2. Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 + Vite UI                   │
│          Port 5173 (Proxies /api -> 127.0.0.1:4000)    │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP REST
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express Backend              │
│                      Port 4000                         │
│                                                        │
│   Primary AI: Google Gemini (flash-lite / Vision)      │
│   Secondary AI (Fallback): OpenAI (gpt-4o-mini)        │
│   Music Retrieval: Spotify Web API                     │
└────────────────────────────────────────────────────────┘
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, Vitest + React Testing Library.
- **Backend:** Node.js, Express, TypeScript (`tsx`), Zod validation, Supertest, Vitest.
- **AI Models:**
  - **Google Gemini (Primary):** `gemini-flash-lite-latest` for natural language intent extraction, Gemini Vision for webcam mood detection.
  - **OpenAI (Fallback Only):** `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`.
    > [!IMPORTANT]
    > **Never invent or configure non-existent model names** like `gpt-5.4-nano` or `gpt-5-nano`. Only use officially released models.
- **Spotify API:** OAuth 2.0 / Client Credentials flow with in-memory token store. Spotify content is **never** sent to AI models (one-way pipeline for Spotify Developer compliance).

---

## 3. Core Features & Endpoints

| Route | Method | Payload / Description |
|---|---|---|
| `/api/status` | `GET` | Reports system mode (`live` vs `mock`), credentials status, and Spotify auth. |
| `/api/music/search` | `POST` | `{ prompt, discoveryMode, preferences, historySignals }` &rarr; Intent tags + 10 live tracks. |
| `/api/music/interpret` | `POST` | Returns extracted structured intent without fetching tracks. |
| `/api/music/analyze-image` | `POST` | `{ image: "data:image/...base64" }` &rarr; Visual facial expression & suggested music direction. |
| `/api/transition/plan` | `POST` | `{ currentMood, targetMood, stageCount }` &rarr; Returns a multi-stage emotional arc. |
| `/api/transition/playlist` | `POST` | Generates a sequential tracklist mapping to each journey stage. |
| `/api/spotify/*` | `ALL` | Auth handshake, token exchange, and callback. |

---

## 4. UI & Aesthetic Guidelines

1. **Apple "Liquid Glass" Aesthetic:**
   - Frosted translucent panels (`backdrop-blur-xl bg-white/[0.04]` or dark liquid glass).
   - Subtle thin borders (`border border-white/10`).
   - Deep rich atmospheric backgrounds with ambient mood glows.
   - When dialogs/modals open (e.g. `CameraModal`), background opacity should remain slightly visible with liquid glass backdrop blur rather than being pitch black.
2. **Button Styling & Vibrancy:**
   - Primary action buttons (like the **Discover** button) should be saturated, vibrant, and tactile with active micro-animations (`scale-95`, vibrant gradients).
3. **Dynamic Mood Theming:**
   - The UI adapts its ambient accent colors based on the current mood/intent (see `frontend/src/lib/moodTheme.ts` and `useMoodTheme.ts`).

---

## 5. How the User Likes Work to Be Done

### Rule 1: Always Keep the Test Suite Green
The codebase has 114 tests (64 backend + 50 frontend). Before declaring any task done, run:
```bash
npm run typecheck
npm test
```
- Never suppress tests by deleting them.
- If you modify code, update or add tests so that 100% of tests pass.

### Rule 2: Zero Port & Process Leaks on Windows
- Vite runs on `http://127.0.0.1:5173` and proxies `/api` to Express on `http://127.0.0.1:4000`.
- If the backend crashes or stops while Vite is running, users get **502 Bad Gateway / ETIMEDOUT**.
- When managing servers in Windows:
  - Check listening ports: `netstat -ano | findstr :4000` and `netstat -ano | findstr :5173`
  - Terminate lingering zombie processes if needed: `taskkill /F /PID <pid>`
  - Avoid command chaining errors: use `cmd.exe /c` when executing multiline or combined shell commands on Windows.

### Rule 3: Respect Fallback & Mock Architecture
- Sonora works in **Mock Mode** if no API keys are present.
- If Gemini is configured, Sonora runs in **Live Mode** even if OpenAI has no prepaid balance.
- Do not make OpenAI a hard blocker for application startup or search.

### Rule 4: Git & Branch Hygiene
- Active working branch is **`Ash`**.
- Keep `Ash` clean and rebased/synced with `main` and `origin`.
- Remote URLs use `.git` suffix to avoid Windows Schannel SSL issues.

### Rule 5: Verify End-to-End Before Answering
Don't assume code works just because it compiled. Test the endpoint or component:
- Run a quick fetch against the running server to verify live responses.
- Verify both the frontend and backend are communicating cleanly.

