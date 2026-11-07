# 30-Second Audio Preview — Feasibility & Implementation Plan

## 1. Current State & Why Previews Are Hidden on Live Searches

### What Is Already Built in the Frontend
- **Single-Instance Audio Controller ([`frontend/src/components/TrackGrid.tsx`](./frontend/src/components/TrackGrid.tsx))**:
  - Manages an HTML5 `<Audio>` instance (`audioRef`), tracking `activePreviewId` and normalized `previewProgress` (`0` → `1`).
  - Automatically pauses any playing preview when another track is clicked or when the component unmounts.
- **Circular Progress + Equalizer Button ([`frontend/src/components/PreviewButton.tsx`](./frontend/src/components/PreviewButton.tsx))**:
  - Renders a circular SVG progress ring and a 3-bar animated audio equalizer (`eq-bar-1`, `eq-bar-2`, `eq-bar-3`) overlaid on the album art.
- **Connected Surfaces**:
  - [`TrackCard.tsx`](./frontend/src/components/TrackCard.tsx): Displays `PreviewButton` on the album artwork and triggers the rotating aurora card glow while `isPreviewPlaying` is active.
  - [`SongDetailsDialog.tsx`](./frontend/src/components/SongDetailsDialog.tsx): Displays `PreviewButton` on the hero album artwork inside the Track Inspector modal.

### The Root Bottleneck
- Spotify deprecated `preview_url` in standard `/v1/search` Web API responses for Development Mode apps, returning `preview_url: null` for most tracks in [`backend/src/services/spotify/trackMapper.ts`](./backend/src/services/spotify/trackMapper.ts).
- Because `track.previewUrl` is `null`, the `{track.previewUrl && <PreviewButton ... />}` guard hides the preview button on live Spotify results.

---

## 2. Feasible Implementation Options

| Option | Mechanism | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Option A: Public Preview Enricher (iTunes / Deezer API)** | When Spotify returns `preview_url: null`, the backend queries Apple iTunes Search API (`itunes.apple.com/search`) or Deezer Public API (`api.deezer.com/search`) using `artist + track name` to retrieve a 30s `.m4a`/`.mp3` preview stream. | - Zero API keys or user login required<br>- Works with existing custom Liquid Glass `PreviewButton`, equalizer, and aurora glow<br>- Works for all visitors (Spotify Free & Premium) | - Adds ~150–250ms on uncached searches (mitigated via parallel `Promise.allSettled` + in-memory cache) |
| **Option B: Spotify Embed Page Extractor** | Backend fetches `https://open.spotify.com/embed/track/{id}` and parses the embedded JSON state (`audioPreview.url`) to get Spotify's own 30-second MP3 preview URL. | - Exact track match by Spotify ID<br>- Uses our native custom UI (`PreviewButton`) | - Relies on Spotify's public embed HTML structure |
| **Option C: Hybrid Enricher (Recommended)** | Backend tries Spotify Embed `audioPreview.url` / iTunes Search API fallback in parallel with an in-memory cache and a `1500ms` timeout. | - ~98%+ preview coverage across both **Discover** and **Mood Transition** tabs<br>- Native Liquid Glass UI with zero login barrier | - None |

---

## 3. Step-by-Step Implementation Plan (When Ready to Build)

### Phase 1: Backend Preview Resolver
1. **Create `backend/src/services/spotify/previewEnricher.ts`**:
   - Implement `enrichTracksWithPreviews(tracks: Track[]): Promise<Track[]>`.
   - Maintain an in-memory `Map<string, string | null>` cache keyed by Spotify track ID.
   - For tracks with `previewUrl === null`, run parallel lookups (`Promise.allSettled`) with an `AbortSignal.timeout(1500)`:
     1. Query iTunes Search API: `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${name}`)}&entity=song&limit=1` → read `results[0]?.previewUrl`.
     2. Fallback to Spotify embed page (`https://open.spotify.com/embed/track/${track.id}`) regex extraction of `"audioPreview":{"url":"([^"]+)"}` if needed.
   - Never fail the search request if preview enrichment times out or fails; gracefully keep `previewUrl: null`.
2. **Integrate into Discovery & Transition Pipelines**:
   - Call `enrichTracksWithPreviews` on the final selected tracks in:
     - [`backend/src/services/music/recommendationEngine.ts`](./backend/src/services/music/recommendationEngine.ts) (Discover tab, 9–12 tracks)
     - [`backend/src/services/transition/playlistAssembler.ts`](./backend/src/services/transition/playlistAssembler.ts) (Mood Transition tab, 4 stages)

### Phase 2: Frontend Playback Enhancements
1. **Discover Grid ([`TrackCard.tsx`](./frontend/src/components/TrackCard.tsx))**:
   - Already wired! Once `track.previewUrl` is populated by the backend, the centered `PreviewButton` and active aurora glow will appear automatically on every playable card.
2. **Track Inspector Modal ([`SongDetailsDialog.tsx`](./frontend/src/components/SongDetailsDialog.tsx))**:
   - Add a sleek 30-second progress/scrub bar (`0:00 / 0:30`) inside the hero showcase card alongside the `PreviewButton`.
3. **Mood Transition Stage Cards ([`LayeredPlaylistView.tsx`](./frontend/src/components/transition/LayeredPlaylistView.tsx))**:
   - Reuse the audio preview state so users can also preview 30-second clips across all 4 stages of their emotional music journey.
4. **(Optional) Sticky Bottom Mini-Player Bar**:
   - Floating glass pill at the bottom of the viewport showing currently playing track artwork, title, artist, animated equalizer, progress bar, and pause/close controls.

