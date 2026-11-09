# ECHORA

<div align="center">

![ECHORA Banner](https://raw.githubusercontent.com/Echo-Ra/EchoRa/main/frontend/public/banner.png)

**AI-Native Mood & Psychophysiological Music Intelligence Engine**

[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![Spotify Web API](https://img.shields.io/badge/Spotify-Web_API-1DB954?style=for-the-badge&logo=spotify&logoColor=white)](https://developer.spotify.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_OAuth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

---

## 📖 Overview

**ECHORA** is an intelligent, mood-aware music discovery ecosystem that bridges nuanced human emotion with global music catalogs. Users express how they feel through open-ended natural language (*"quiet rainy midnight in a neon Tokyo café"*), voice dictation, or facial expressions.

ECHORA processes the psychological nuance through **Google Gemini 2.5 Flash**, builds deep sonic profiles (cadence, timbre, harmonic modes, and anti-sonic exclusions), resolves tracks through the **Spotify Web API**, and streams full-length audio in-app with zero subscription requirements.

---

## 🚀 Core Features

- **Multimodal Emotional Input:** Express vibe via natural language text, live browser speech-to-text (Web Speech API), or opt-in facial emotion recognition (MediaStream + Canvas).
- **Deep Sonic Profiling & NLU:** Gemini analyzes psychological nuance to deduce tempo (BPM cadence), timbre textures (e.g. *warm tape saturation*, *cold post-punk reverb*), harmonic mode (*minor*, *major*, *modal*), and **Anti-Sonic Aura** (strict banning of disruptive instruments like phonk cowbells or aggressive trap 808s).
- **Multi-Query Semantic Retrieval:** Generates 5 specialized query facets per intent (`moodQuery`, `genreQuery`, `contextQuery`, `masterQuery`, `curatorQuery`) with cultural anchoring (e.g. Bollywood/Hindi, Spanish, Russian, Japanese) and vintage slang translation.
- **Native In-App Audio Playback:** Full-featured bottom player bar (`BottomPlayerBar`) with real-time scrubbing, buffering feedback, loop modes, and continuous track auto-advancement.
- **Continuous Discovery Engine:** Infinite exploration via `/api/music/load-more` with dynamic track deduplication, artist frequency re-balancing, and interactive `<VibeRefinementBar />` controls.
- **4-Stage Mood Transition Planner:** Synthesizes psychophysiological bridges between disparate emotional states (e.g., *Anxious* → *Grounded* → *Calm* → *Energized*), producing 20 curated tracks with seamless cross-stage queue progression.
- **GPU-Composited 60fps Liquid Glass UI:** Built with React 19, Framer Motion, and Tailwind CSS. Employs `requestAnimationFrame` + CSS custom variable card tilt (`--rx`, `--ry`) with zero React state re-renders during pointer interactions.
- **Identity & Personalization:** Supabase OAuth (Google & Spotify) + instantaneous Guest Mode, persistent favorites, and customizable discovery modes (`Familiar`, `Balanced`, `Explore`).

---

## 🏛️ System Architecture

ECHORA is engineered as a clean 4-tier decoupled pipeline separating client-side presentation, cloud orchestration, intelligence synthesis, and persistent identity.

```mermaid
flowchart TD
  subgraph TIER1["1. Client Presentation Layer (React 19 + Vite + Tailwind CSS)"]
    UI_COMP["Composer & Multimodal Input<br/>(Text, Voice STT, Camera Mood)"]
    UI_GRID["Track Grid & Liquid Glass Cards<br/>(Zero-Rerender GPU Tilt: --rx, --ry)"]
    UI_PLAYER["Native Audio Player Bar<br/>(Persistent Queue, Loop & Scrubbing)"]
    UI_VIBE["Vibe Refinement Controls<br/>(Interactive Mood Shift on Page 1)"]
    UI_TRANS["Mood Transition Journey View<br/>(4 Layered Progressive Stages)"]
    UI_AUTH["Auth Landing & Profile Menu<br/>(Supabase OAuth + Guest Mode)"]
  end

  subgraph TIER2["2. Express Backend API Gateway (Node.js + TypeScript)"]
    API_ROUTER["API Router & Middleware<br/>(Rate Limiting, Error Boundary, CORS)"]
    EP_SEARCH["POST /api/music/search<br/>(Initial Intent & Fusion)"]
    EP_MORE["POST /api/music/load-more<br/>(Continuous Discovery)"]
    EP_REFINE["POST /api/music/refine-vibe<br/>(Dynamic Vibe Shift)"]
    EP_STREAM["GET /api/music/stream-url<br/>(Audio Stream Resolver)"]
    EP_TRANS["POST /api/transition/*<br/>(Plan & Generate Music)"]
  end

  subgraph TIER3["3. Cognitive Intelligence & Audio Engines"]
    GEMINI_NLU["Gemini 2.5 Flash Engine<br/>(Sonic Profile, Anti-Sonic Aura, 5 Query Facets)"]
    FUSION_ENGINE["Fusion & Candidate Deduplication<br/>(Multi-Query Synthesis & Artist Capping)"]
    TRANS_PLANNER["Emotional Trajectory Engine<br/>(4-Stage Psychological Bridge)"]
    YT_RESOLVER["YouTube Stream Resolver & Cache<br/>(Search HTML Scraper + ytdl Audio Extraction)"]
    SPOTIFY_SVC["Spotify Web API Integration<br/>(Catalog Search & Metadata Mapping)"]
  end

  subgraph TIER4["4. Identity & External Services"]
    EXT_GEMINI["Google Gemini Cloud API"]
    EXT_SPOTIFY["Spotify Web API"]
    EXT_SUPABASE["Supabase Auth (OAuth 2.0 PKCE)"]
    EXT_CDN["Google Video CDN (Audio Stream)"]
  end

  UI_COMP --> EP_SEARCH
  UI_GRID --> EP_MORE
  UI_VIBE --> EP_REFINE
  UI_PLAYER --> EP_STREAM
  UI_TRANS --> EP_TRANS
  UI_AUTH --> EXT_SUPABASE

  API_ROUTER --> GEMINI_NLU
  API_ROUTER --> FUSION_ENGINE
  API_ROUTER --> TRANS_PLANNER
  API_ROUTER --> YT_RESOLVER
  API_ROUTER --> SPOTIFY_SVC

  GEMINI_NLU --> EXT_GEMINI
  SPOTIFY_SVC --> EXT_SPOTIFY
  YT_RESOLVER --> EXT_CDN
```

---

## 🔄 End-to-End Workflows

### 1. Intent Extraction & Continuous Discovery Flow

```mermaid
flowchart LR
  subgraph INPUT["User Prompt"]
    P1["Natural Language<br/>'nostalgic 90s bollywood rain'"]
    P2["Discovery Mode<br/>(Familiar / Balanced / Explore)"]
  end

  subgraph GEMINI["Gemini 2.5 Flash NLU"]
    G1["Sonic Profiling<br/>Harmonic: Minor<br/>Instruments: Bansuri, Piano<br/>Anti-Sonic: No Phonk, No 808s"]
    G2["5-Facet Query Generation<br/>moodQuery, genreQuery,<br/>contextQuery, masterQuery,<br/>curatorQuery"]
  end

  subgraph SPOTIFY["Catalog Recall & Fusion"]
    S1["Multi-Query Execution<br/>(Spotify Web API Search)"]
    S2["Reranking & Artist Balance<br/>(Max 2 tracks per primary artist)"]
  end

  subgraph CLIENT["Client Rendering"]
    C1["Aurora Color Grading<br/>(CSS Theme retinting)"]
    C2["Track Grid Rendering<br/>(Ready for In-App Playback)"]
  end

  P1 & P2 --> G1 --> G2 --> S1 --> S2 --> C1 & C2
```

---

### 2. Native Audio Playback & Streaming Architecture

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as TrackCard / PlayerBar
  participant Backend as Express API (/api/music/stream-url)
  participant Cache as Memory Cache (Map, 3h TTL)
  participant YT as YouTube Engine (ytdl-core)
  participant Audio as HTML5 Audio Element

  User->>UI: Clicks "Play Here" on Track
  UI->>Backend: GET /api/music/stream-url?trackName=...&artist=...
  
  alt Video ID & Stream URL Cached
    Backend->>Cache: Check videoId in memory
    Cache-->>Backend: Return cached audio URL
  else Fresh Extraction
    Backend->>YT: Search & resolve candidate videoId
    Backend->>YT: Extract highest-quality audio format URL
    Backend->>Cache: Save URL (TTL: 3 hours)
  end

  Backend-->>UI: 200 OK { audioUrl: "https://...googlevideo.com/..." }
  UI->>Audio: audio.src = audioUrl; audio.play()
  Audio-->>User: Seamless full-length music playback
```

---

### 3. 4-Stage Mood Transition Journey

```mermaid
flowchart TD
  START["Select Starting Mood<br/>(e.g., Anxious)"] --> DEST["Select Destination Mood<br/>(e.g., Energized)"]
  DEST --> PLAN["POST /api/transition/plan<br/>Gemini synthesizes 4 emotional stages"]
  
  subgraph STAGES["4-Stage Psychological Progression"]
    S1["Stage 1: Grounding & Acceptance<br/>(Slow cadence, warm analog texture)"]
    S2["Stage 2: Gentle Shift<br/>(Moderate tempo, melodic acoustic bridge)"]
    S3["Stage 3: Energy Elevation<br/>(Uplifting harmony, rhythmic groove)"]
    S4["Stage 4: Target Vibe Achievement<br/>(Driving cadence, full musical richness)"]
    S1 --> S2 --> S3 --> S4
  end

  PLAN --> STAGES
  STAGES --> ASSEMBLE["POST /api/transition/generate-music<br/>Spotify Assembler + Stage Intent Generator"]
  ASSEMBLE --> QUEUE["Continuous 20-Song Ordered Queue<br/>(In-App Sequential Playback without Loop)"]
```

---

## ⚡ UI Performance Architecture

ECHORA places extreme emphasis on high-frame-rate interaction and layout stability:

1. **Zero-Rerender 3D Liquid Tilt:**
   * Instead of storing 3D tilt coordinates in React component state (`useState`), `TrackCard` calculates cursor offset on `requestAnimationFrame` and writes directly to CSS variables (`--rx`, `--ry`).
   * Results in smooth **60fps hardware-accelerated animations** without invalidating virtual DOM nodes.
2. **Component Isolation with `React.memo` & `useCallback`:**
   * Heavy components (`TopBar`, `TrackCard`, `TrackGrid`, `LayeredPlaylistView`) are wrapped in `React.memo`.
   * Event handlers are bound with `useCallback` to ensure that keystrokes in the composer do not cause render cascades across the 25+ rendered cards.
3. **Web Vitals Telemetry:**
   * Built-in `initPerfMetrics()` initializes non-intrusive `PerformanceObserver` instances tracking **First Contentful Paint (FCP)**, **Cumulative Layout Shift (CLS)**, and **Long Tasks**.

---

## 📁 Repository Structure

```text
EchoRa/
├── backend/                       # Node.js + Express API Backend
│   ├── src/
│   │   ├── controllers/           # HTTP route handlers (Music, Transition, Camera)
│   │   ├── routes/                # Express endpoint definitions
│   │   ├── services/
│   │   │   ├── gemini/            # Intent extraction, sonic profiles & system instructions
│   │   │   ├── music/             # Multi-query fusion, audio streaming & YouTube resolvers
│   │   │   ├── spotify/           # Spotify Web API client & OAuth helpers
│   │   │   └── transition/        # Stage trajectory generator & playlist assembler
│   │   ├── types/                 # Shared TypeScript interfaces & schemas
│   │   └── server.ts              # Express server entry point
│   └── tests/                     # 20 test suites (Unit & Supertest Integration)
│
├── frontend/                      # React 19 + TypeScript + Vite Client
│   ├── src/
│   │   ├── api/                   # API clients & network error boundaries
│   │   ├── components/            # UI components (Composer, Hero, TrackCard, BottomPlayerBar...)
│   │   │   ├── auth/              # Supabase Auth Landing & OAuth Dialogs
│   │   │   └── transition/        # Mood Transition interactive visualizer
│   │   ├── context/               # React Contexts (AudioPlayerContext, AuthContext)
│   │   ├── hooks/                 # Custom hooks (useSearch, useMoodTheme, useSpeechRecognition)
│   │   ├── lib/                   # Supabase client, formatting helpers, and themes
│   │   └── App.tsx                # Main application orchestrator & layout
│   └── tests/                     # 12 test suites (Vitest + Testing Library)
│
├── package.json                   # Monorepo workspaces definition
└── README.md                      # Architecture documentation
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 9.0.0`

### Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/Echo-Ra/EchoRa.git
cd EchoRa
npm install
```

---

### Running in Zero-Config Mock Mode

EchoRa includes a comprehensive mock mode with realistic intent extraction, pre-packaged acoustic profiles, and audio previews requiring **no external credentials**:

```bash
npm run dev
```

* **Frontend:** [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
* **Backend:** [http://127.0.0.1:4000/](http://127.0.0.1:4000/)

---

### Configuring Live Mode (Production)

Create a `.env` file in both `backend/` and `frontend/` folders:

#### `backend/.env`
```ini
PORT=4000
NODE_ENV=development

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Spotify Web API
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4000/api/spotify/callback
```

#### `frontend/.env`
```ini
# Supabase OAuth
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Launch the development servers:
```bash
npm run dev
```

---

## 🧪 Testing & Verification

Run the comprehensive test suite across the monorepo:

```bash
# Run all backend and frontend tests
npm test

# Run backend unit and integration tests (20 files, 111 tests)
npm run test:backend

# Run frontend UI and context tests (12 files, 60 tests)
npm run test:frontend

# Run strict TypeScript typechecking
npm run typecheck

# Production build verification
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
