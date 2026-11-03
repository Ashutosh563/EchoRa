# SONORA (Phase 1)

AI-powered, mood-aware music discovery and recommendation application.

SONORA enables natural-language music discovery: users describe their vibe, setting, or state of mind (e.g. *"Recommend peaceful instrumental music for studying at 3 AM"*), and the system extracts structured listening intent via **Google Gemini** and retrieves matching tracks via the **Spotify Web API**.

---

## Architecture Overview

```text
USER INPUT (React UI)
    ↓  POST /api/music/search
EXPRESS BACKEND (127.0.0.1:4000)
    ↓
GEMINI NATURAL-LANGUAGE UNDERSTANDING (Extracts structured JSON)
    ↓
SEMANTIC QUERY GENERATOR (Pure function -> primary + alternative queries)
    ↓
SPOTIFY SEARCH API (Retrieves tracks & metadata via OAuth 2.0)
    ↓
FRONTEND DISPLAY (Interpreted intent tags + track cards)
```

### Important Compliance Rules
- **One-way Pipeline:** Gemini interprets ONLY user natural-language queries. No Spotify metadata or track content is ever ingested into or processed by Gemini/AI models.
- **No Scraping or AI Profiling:** Spotify content is used solely for real-time display and attribution links.

---

## Project Structure

```text
hack 3333/
├── package.json               # Root npm workspace
├── frontend/
│   ├── src/
│   │   ├── api/               # HTTP client & mock interfaces
│   │   ├── components/        # SearchBar, IntentDisplay, TrackCard, StatusBar...
│   │   └── App.tsx            # Main application component
│   └── tests/                 # Dedicated frontend test directory
├── backend/
│   ├── scripts/setup.ts       # Secure CLI credential setup wizard
│   ├── src/
│   │   ├── services/
│   │   │   ├── gemini/        # Gemini intent extraction & schema
│   │   │   ├── spotify/       # Spotify OAuth 2.0 & Search API
│   │   │   └── music/         # Query generation & search pipeline
│   │   ├── routes/            # REST endpoints
│   │   ├── controllers/       # Request handling & mode resolution
│   │   └── app.ts             # Express app setup
│   └── tests/
│       ├── unit/              # Dedicated unit tests
│       └── integration/       # Supertest route integration tests
└── README.md
```

---

## Setup & Getting Started

### 1. Prerequisites
- **Node.js** >= 20.0.0 (tested on Node v26)
- **Spotify Developer Account** with an active Spotify Premium subscription (as required by Spotify Developer Mode terms).

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Without Credentials (Mock Mode)
The application works immediately out-of-the-box in **Mock Mode** without any API keys:
```bash
npm run dev
```
Open [http://127.0.0.1:5173](http://127.0.0.1:5173) in your browser. The status bar will confirm `Mock Mode`.

### 4. Configure Credentials for Live Mode
To enable live AI intent extraction and real Spotify catalog search:

1. **Get a Gemini API Key:** From [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Create a Spotify App:** In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
   - Set the Redirect URI to: `http://127.0.0.1:4000/api/spotify/callback`
3. **Run the Interactive Setup Wizard:**
   ```bash
   npm run setup
   ```
   Follow the prompts to enter your Gemini API Key, Spotify Client ID, and Spotify Client Secret. The credentials are encrypted and stored in `backend/.env` (gitignored, file mode 0600).
4. **Authorize Spotify:**
   - Run `npm run dev`.
   - In the browser UI at [http://127.0.0.1:5173](http://127.0.0.1:5173), click the green **Connect Spotify** button in the status bar to complete the OAuth 2.0 handshake.
   - The status bar will automatically flip to **Live Mode**.

---

## Running Tests

All unit and integration tests are isolated inside dedicated `tests/` directories:

```bash
# Run all backend and frontend tests
npm test

# Run backend unit & integration tests
npm run test:backend

# Run frontend tests
npm run test:frontend

# Run TypeScript typechecks
npm run typecheck
```

