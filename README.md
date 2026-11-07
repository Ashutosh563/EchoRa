# EchoRa (SONORA) — AI Mood Music Recommender

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75B2?logo=google-gemini&logoColor=white)](https://aistudio.google.com/)
[![Spotify Web API](https://img.shields.io/badge/Spotify-Web_API-1DB954?logo=spotify&logoColor=white)](https://developer.spotify.com/)

**EchoRa (SONORA)** is an intelligent, multimodal music discovery engine that bridges human emotional states with music. Users express their vibe, environment, or state of mind via natural language text, voice dictation, or camera mood capture. The system extracts structured listening intent through **Google Gemini 2.5 Flash** and dynamically orchestrates catalog retrieval via the **Spotify Web API**.

Beyond simple searches, EchoRa features an emotional trajectory engine that plans and generates multi-stage **Mood Transition Journeys** (e.g., transforming an *anxious* state into a *deeply focused* state across a 4-stage psychological bridge).

---

## Table of Contents

- [Core Capabilities](#core-capabilities)
- [System Architecture (Layered)](#system-architecture-layered)
- [Workflow Architecture](#workflow-architecture)
  - [Module 1: Discovery & Mood Search](#module-1-discovery--mood-search)
  - [Module 2: Mood Transition Journey](#module-2-mood-transition-journey)
- [Compliance & Privacy by Design](#compliance--privacy-by-design)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running in Mock Mode (Zero Config)](#running-in-mock-mode-zero-config)
  - [Configuring Live Mode (Gemini + Spotify)](#configuring-live-mode-gemini--spotify)
- [Testing](#testing)

---

## Core Capabilities

- **Multimodal Expression:** Input moods via natural language prompts (*"rainy Tuesday night studying in a quiet coffee shop"*), voice transcription, or camera mood capture.
- **Cognitive Intent Extraction:** Powered by Google Gemini 2.5 Flash NLU to extract valence, energy, tempo, target genres, acoustic qualities, and succinct 10-word explanations.
- **Adaptive Discovery Modes:**
  - `Familiar`: Biases queries toward user favorites and known genres.
  - `Balanced`: Combines favored styles with fresh recommendations.
  - `Explore`: Explores adjacent niches, filtering out repetitive tracks and disliked genres.
- **Mood Transition Journey Planner:** Builds a 4-stage emotional bridge between disparate psychological states (e.g., *Stressed* → *Grounded* → *Calm* → *Energized*), generating tailored soundtrack stages with cross-stage deduplication.
- **Dynamic Aurora UI:** Responsive interface built with React 19, TypeScript, and Tailwind CSS with real-time audio playback previews and contextual mood themes.

---

## System Architecture (Layered)

The platform is designed in four distinct layers ensuring clear separation of concerns, high maintainability, and strict adherence to API policies.

```mermaid
%%{init: {'theme':'base','themeVariables':{'lineColor':'#c4c4c4','primaryTextColor':'#f2f2f2','edgeLabelBackground':'#4a4a4a','fontSize':'13px'}}}%%
flowchart TD
 subgraph LAYER1["1. Client Presentation Layer (Vite + React 19 + TypeScript + Tailwind CSS)"]
  P1["Manual Mood Selector<br/>(Priority Input)<br/>(/mood)"]
  P2["Text and Context Input<br/>(/describe)"]
  P3["Facial Mood Capture<br/>(Opt-in)<br/>(/camera)"]
  P4["Voice Mood Capture<br/>(/voice)"]
  P5["Transition Playlist Builder<br/>(/transition)"]
  P6["Discovery Mode Switcher<br/>(/discover)"]
  P7["Mood Library Browser<br/>(Song, Artist, Mood)<br/>(/library)"]
  P8["Artist Mood Profile<br/>(/artists/:id)"]
  P9["Listening History and Feedback<br/>(/history)"]
  P10["Sleep Wind-Down Mode<br/>(/sleep)"]
  P1 ~~~ P5
  P2 ~~~ P6
  P3 ~~~ P7
  P4 ~~~ P8
  P5 ~~~ P9
  P6 ~~~ P10
 end
 subgraph LAYER2["2. Subsystem API Integrations (Cloud Services and Browser APIs)"]
  Q1["Google Gemini API<br/>(Semantic Context, Text Emotion and 10-Word Reasons)"]
  Q2["Spotify Web API<br/>(Song and Artist Catalogue and Search)"]
  Q3["Web Speech API<br/>(Voice Input to Text Transcript)"]
  Q4["Media Capture and Streams API<br/>(Camera and Microphone Access)"]
  Q5["HTML5 Canvas API<br/>(Camera Frame Capture for Face Analysis)"]
  Q6["HTML5 Audio API<br/>(Audio Playback and Voice Tone Analysis)"]
  Q7["Web Storage API<br/>(Mood Preferences and Listening History Cache)"]
  Q8["REST APIs<br/>(Client-to-Backend Calls for Mood Fusion and Recommender)"]
  Q1 ~~~ Q5
  Q2 ~~~ Q6
  Q3 ~~~ Q7
  Q4 ~~~ Q8
 end
 subgraph LAYER3["3. Mood Analysis and Recommendation Engines"]
  R1["Intent Understanding and NLU Engine<br/>(Parses Ambiguous Natural Language Input)"]
  R2["Music Recommendation and Query Generation Engine<br/>(Bridges AI Intent with Spotify's Search Catalog)"]
  R3["Discovery Modes and Preference Engine<br/>(Adjusts Recommendations by User History and Active Mode)"]
  R4["Multimodal Vision and Camera Mood Engine<br/>(Evaluates Real-Time Webcam Snapshots)"]
  R5["Mood Transition and Emotional Trajectory Engine<br/>(Builds an Emotional Bridge Between Psychological States)"]
  R6["Spotify Integration and Auth Engine<br/>(Manages Communication with Spotify)"]
  R1 ~~~ R4
  R2 ~~~ R5
  R3 ~~~ R6
 end
 subgraph LAYER4["4. Data Persistence (Browser-Native Storage)"]
  S1["Browser Local Storage<br/>(Web Storage API, Browser-Native Key-Value Store)"]
  S2["User Preferences and Active Discovery Mode<br/>(Familiar / Balanced / Explore)"]
  S3["Interaction History<br/>(Up to 50 Recent Searches)"]
 end
 LAYER1 --> LAYER2
 LAYER2 --> LAYER3
 LAYER3 --> LAYER4
 classDef n fill:#1f1f1f,stroke:#9a9a9a,color:#f2f2f2,stroke-width:1px
 classDef proto fill:#1f1f1f,stroke:#9a9a9a,color:#f2f2f2,stroke-width:1px,stroke-dasharray:5 5
 class P1,P2,P5,P6,P7,P8,P9,Q1,Q2,Q6,Q7,Q8,R1,R2,R3,R5,R6,S1,S2,S3 n
 class P3,P4,P10,Q3,Q4,Q5,R4 proto
 style LAYER1 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style LAYER2 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style LAYER3 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style LAYER4 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 linkStyle default stroke:#c4c4c4,stroke-width:1.3px
```

### Layer Breakdown

1. **Client Presentation Layer:** Interactive views providing manual mood selectors, text input, camera/voice captures, mood library browsing, history, and transition builders.
2. **Subsystem API Integrations:** Handles cloud connections (Gemini NLU, Spotify Web API) and native browser APIs (Web Speech, Canvas, HTML5 Audio, Web Storage).
3. **Mood Analysis & Recommendation Engines:**
   - **NLU Engine:** Parses ambiguous natural language queries into structured musical parameters.
   - **Query Generation Engine:** Bridges emotional attributes into Spotify-compatible search parameters.
   - **Preference & Discovery Engine:** Weights queries against user preferences and active modes.
   - **Emotional Trajectory Engine:** Synthesizes psychophysiological transition states.
   - **Spotify Integration Engine:** Handles OAuth 2.0 PKCE / token exchanges and API queries.
4. **Data Persistence:** Browser-native local storage retaining preferences, recent history (up to 50 queries), and favorite/disliked tags without external tracking.

---

## Workflow Architecture

EchoRa operates via staged pipelines featuring deterministic decision gates.

### Module 1: Discovery & Mood Search

Transforms open-ended user input and mode preferences into an optimized Spotify catalog search:

```mermaid
%%{init: {'theme':'base','themeVariables':{'lineColor':'#c4c4c4','primaryTextColor':'#f2f2f2','edgeLabelBackground':'#4a4a4a','fontSize':'13px'}}}%%
flowchart TD
 subgraph SA1["Stage 1: Client Input and Local Preferences"]
  A1["User Input<br/>(Text Prompt / Voice Dictation / Camera Capture)"]
  A2["Discovery Mode Selection<br/>(Familiar / Balanced / Explore)"]
  A3["Local Preferences Read<br/>(localStorage: Favorite and Disliked Genres, Artists)"]
  A2 --> A3
 end
 subgraph SA2["Stage 2: Request to Express Backend"]
  B1["HTTP POST /api/music/search<br/>(prompt + discoveryMode + preferences)"]
 end
 subgraph SA3["Stage 3: Intent Extraction and Discovery Processing"]
  C1["Gemini 2.5 Flash NLU<br/>(Extracts Mood, Valence, Energy, Tempo, Keywords)"]
  C2{"Active Discovery Mode?"}
  C3["Favor Favorites"]
  C4["Blend Favorites with New Styles"]
  C5["Steer Away from Repeated Listening, Explore Adjacent Genres, Filter Disliked Styles"]
  C6["Discovery Processor Output<br/>(Mode-Weighted Intent)"]
 end
 subgraph SA4["Stage 4: Spotify Search"]
  D1["Exactly 1 Optimized Search Query<br/>(e.g., q: synthwave outrun -metal)"]
  D2["Spotify Search API Returns Track Results"]
 end
 subgraph SA5["Stage 5: Response and UI Presentation"]
  E1["200 OK<br/>(intent, tracks, appliedMode)"]
  E2["UI Presentation<br/>(Tracks Grid, Mood Intent Panel, Dynamic Aurora Theme)"]
 end
 A1 --> B1
 A3 --> B1
 B1 --> C1
 C1 --> C2
 C2 -->|Familiar| C3
 C2 -->|Balanced| C4
 C2 -->|Explore| C5
 C3 --> C6
 C4 --> C6
 C5 --> C6
 C6 --> D1
 D1 --> D2
 D2 --> E1
 E1 --> E2
 classDef n fill:#1f1f1f,stroke:#9a9a9a,color:#f2f2f2,stroke-width:1px
 class A1,A2,A3,B1,C1,C2,C3,C4,C5,C6,D1,D2,E1,E2 n
 style SA1 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SA2 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SA3 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SA4 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SA5 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 linkStyle default stroke:#c4c4c4,stroke-width:1.3px
```

- **Stage 1 (Client Input):** Capture prompt + active mode (`Familiar`, `Balanced`, `Explore`) + stored preferences.
- **Stage 2 (Backend Request):** `POST /api/music/search` sends payload to the Express server.
- **Stage 3 (Intent & Discovery Processing):** Gemini 2.5 Flash extracts musical intent parameters. The discovery processor shapes the query based on the active mode.
- **Stage 4 (Spotify Search):** Exactly 1 optimized query string is executed against the Spotify Search API.
- **Stage 5 (Response & Presentation):** Server delivers intent explanation and matching track metadata; the client updates the UI and aurora theme.

---

### Module 2: Mood Transition Journey

Creates an emotional progression that guides the user from an initial psychological state to a desired target mood:

```mermaid
%%{init: {'theme':'base','themeVariables':{'lineColor':'#c4c4c4','primaryTextColor':'#f2f2f2','edgeLabelBackground':'#4a4a4a','fontSize':'13px'}}}%%
flowchart TD
 subgraph SB1["Stage 1: Journey Setup (Client)"]
  T1["Select Start and Destination Moods<br/>(e.g., Anxious to Focused)"]
  T2["Client Validation<br/>(Both Required, Must Not Be Identical)"]
  T1 --> T2
 end
 subgraph SB2["Stage 2: Journey Planning and Review"]
  P1["HTTP POST /api/transition/plan<br/>(startingMood, destinationMood)"]
  P2["Gemini Transition Planner<br/>(Synthesizes 4-Stage Psychological Bridge)"]
  P3["Interactive Journey Review Card<br/>(Edit Intermediate Mood Names Inline)"]
  P4{"User Decision"}
  P1 --> P2
  P2 --> P3
  P3 --> P4
  P4 -->|Optional Edit / Regenerate| P1
 end
 subgraph SB3["Stage 3: Playlist Generation"]
  G1["User Clicks Generate Transition Playlist<br/>(Explicit Approval Gate)"]
  G2["HTTP POST /api/transition/generate-music<br/>(starting, destination, 4 stages)"]
  G3["Gemini Stage Intent Generator<br/>(4 Distinct Stage Queries in 1 LLM Call)"]
  G4["Spotify Assembler<br/>(Exactly 4 Searches, 1 per Stage: GET /v1/search?q=stage_query)"]
  G5["Cross-Stage Deduplication<br/>(Max 5 Tracks per Stage, Max 20 Total)"]
  G1 --> G2
  G2 --> G3
  G3 --> G4
  G4 --> G5
 end
 subgraph SB4["Stage 4: Playlist Presentation and Playback"]
  H1["200 OK: Layered Playlist<br/>(4 Stage Sections with Track Cards)"]
 end
 T2 --> P1
 P4 -->|Approve| G1
 G5 --> H1
 classDef n fill:#1f1f1f,stroke:#9a9a9a,color:#f2f2f2,stroke-width:1px
 class T1,T2,P1,P2,P3,P4,G1,G2,G3,G4,G5,H1 n
 style SB1 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SB2 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SB3 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 style SB4 fill:#4a4a4a,stroke:#9a9a9a,color:#ffffff
 linkStyle default stroke:#c4c4c4,stroke-width:1.3px
```

- **Stage 1 (Journey Setup):** Select and validate starting and destination moods.
- **Stage 2 (Planning & Review):** Gemini synthesizes a 4-step psychological progression. The user can review, customize stage names, or regenerate.
- **Stage 3 (Playlist Generation):** Upon approval, Gemini generates 4 distinct stage queries in a single call. The Spotify assembler executes searches with cross-stage deduplication (up to 5 tracks per stage, max 20 total).
- **Stage 4 (Playback & Presentation):** Renders a multi-stage sequential track progression with audio previews.

---

## Compliance & Privacy by Design

- **Strict One-Way Pipeline:** Gemini interprets *only* user natural-language queries. No Spotify track content, artist catalog data, or user listening histories are ever fed into or stored by AI models.
- **No Scraping or AI Profiling:** Spotify content is queried in real time purely for immediate playback previews, track metadata, and direct attribution links.
- **Client-Side Privacy:** Camera frame capture and voice transcription run locally using browser-native APIs without transmitting raw biometric video or voice feeds to external servers.

---

## Repository Structure

```text
EchoRa/
├── package.json               # Root workspace configuration
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/               # API clients & Mock providers
│   │   ├── components/        # UI components (SearchBar, IntentDisplay, TrackCard, Aurora...)
│   │   └── App.tsx            # Root application layout & state
│   └── tests/                 # Frontend component and integration tests
├── backend/                   # Node.js + Express + TypeScript
│   ├── scripts/setup.ts       # Interactive setup wizard for API credentials
│   ├── src/
│   │   ├── services/
│   │   │   ├── gemini/        # Gemini intent extraction & transition planner
│   │   │   ├── spotify/       # Spotify OAuth 2.0 & catalog search
│   │   │   └── music/         # Query generation & mode filtering pipeline
│   │   ├── routes/            # REST API endpoints
│   │   ├── controllers/       # Controller handlers
│   │   └── app.ts             # Express application initialization
│   └── tests/
│       ├── unit/              # Backend service unit tests
│       └── integration/       # Supertest route tests
└── README.md                  # Project documentation & architecture
```

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20.0.0`
- **npm** `>= 9.0.0`
- *(Optional for Live Mode)* **Google Gemini API Key** and a **Spotify Developer Account**.

### Installation

Clone the repository and install dependencies across the monorepo:

```bash
git clone https://github.com/your-username/EchoRa.git
cd EchoRa
npm install
```

### Running in Mock Mode (Zero Config)

EchoRa provides a full **Mock Mode** with realistic canned intent extraction and tracks, requiring **no API keys** to run:

```bash
npm run dev
```

Navigate to `http://127.0.0.1:5173`. The status bar will show `Mock Mode`.

### Configuring Live Mode (Gemini + Spotify)

1. Obtain a **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an application in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
   - Set Redirect URI to: `http://127.0.0.1:4000/api/spotify/callback`
3. Launch the interactive credential setup wizard:
   ```bash
   npm run setup
   ```
4. Start the application:
   ```bash
   npm run dev
   ```
5. Click **Connect Spotify** in the UI to complete the OAuth 2.0 handshake. The status bar will switch to **Live Mode**.

---

## Testing

Run unit, integration, and type checks across all workspaces:

```bash
# Run all test suites
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run TypeScript typechecks
npm run typecheck
```

---

## License

This project is open-source under the [MIT License](LICENSE).
