# Recommendation Engine: Phase 0 Behavior Specification

## Purpose and scope

This document defines expected recommendation behavior before ranking changes begin. It preserves the current product setup:

- The Preferences tab remains the source of saved favorite and disliked genres and artists.
- The selected mode remains **Familiar**, **Balanced**, or **Explore**.
- Preferences and mode continue to be stored in the browser profile and sent with each search.
- Gemini continues to interpret the user's request, and Spotify continues to provide the track catalog.
- The recommendation engine may be refactored internally, but this phase does not introduce accounts, server-side profiles, or a replacement preference source.

## Request precedence

Resolve each request in this order:

1. **Current explicit request.** A specific song, artist, language, era, or requested exclusion comes directly from the user's prompt and must be honored when the catalog can satisfy it.
2. **Saved dislikes.** Disliked genres and artists from the Preferences tab are exclusions by default. If the user explicitly asks for a disliked genre or artist in the current prompt, that request takes precedence for that search only.
3. **Current soft intent.** Mood, activity, energy, tempo, and sonic qualities guide retrieval and ranking. Do not invent an activity, mood, or genre when the request does not imply one.
4. **Saved favorites and history.** These personalize results according to the selected discovery mode. They must not override an explicit request or a saved dislike.

When hard constraints leave too few candidates, return fewer results with a clear explanation or retry option. Do not silently relax a hard constraint or substitute sample tracks in a live response.

## Mode behavior

All modes use the same Preferences tab data. They change how favorites and novelty influence eligible candidates; they do not bypass dislikes or explicit request constraints.

| Mode | Expected behavior |
| --- | --- |
| **Familiar** | Give the strongest influence to saved favorite genres and artists and repeated genre interests from local search history. Keep the current prompt's mood and other explicit constraints primary. Rotate among eligible favorites over time instead of always selecting the first saved item. |
| **Balanced** | Keep a meaningful share of results connected to saved favorites and use the remaining space for adjacent genres or artists that fit the prompt. Avoid making the whole result set one unfamiliar style. |
| **Explore** | Give less influence to saved favorites and more to relevant adjacent or less familiar styles. Keep mood, activity, language, explicit artist/song requests, and dislikes intact. Novelty must remain tied to the user's request. |

The modes should result in visibly different ranking behavior when preferences are present, while a prompt with a specific artist or song remains specific in all modes.

## Constraint classification

### Hard constraints

- Exact song or artist requested by the user.
- Explicit language or era request when represented in the intent and supported by catalog metadata.
- Explicit exclusions in the current prompt, such as “no rap” or “without autotune.”
- Saved disliked artists and genres, unless the current prompt explicitly asks for the item.
- Deduplication of the same track or effectively identical release in one result set.

Hard constraints are checked for every result path, including model-reranker fallback and load-more.

### Soft ranking preferences

- Mood, activity, energy, tempo, and sonic profile.
- Saved favorites and inferred history signals, weighted by discovery mode.
- Novelty, adjacent styles, catalog variety, and artist diversity.

Soft preferences affect ordering and query selection. They should not cause an explicit request to disappear.

## Baseline evaluation set

Use these scenarios for human review and later automated regression checks. The expected outcomes describe behavior, not exact tracks or a fixed ordering. Run preference scenarios with the same prompt under each mode, using the example Preferences tab profile below.

### Example saved profile

- Favorite genres: `indie pop`, `jazz`
- Favorite artists: `Japanese Breakfast`, `BADBADNOTGOOD`
- Disliked genres: `country`
- Disliked artists: `Drake`
- History signals: `indie pop` (frequency 4), `ambient` (frequency 2)

| ID | Prompt | Setup | Expected behavior |
| --- | --- | --- | --- |
| P0-01 | “Calm music for reading” | Example profile; run Familiar, Balanced, Explore | All modes return calm/read-friendly candidates. Familiar leans toward favorites/history, Balanced mixes familiar and adjacent styles, and Explore favors relevant less-familiar styles. |
| P0-02 | “Upbeat indie pop for a road trip” | Example profile; run all modes | Preserve the explicit genre and road-trip intent in every mode. Mode can change candidate ordering, but cannot replace indie pop with an unrelated style. |
| P0-03 | “Country songs for a country dance” | Example profile | The current explicit request opts into the saved disliked genre for this search. Country results are allowed for this request only. |
| P0-04 | “Jazz for a late-night study session” | Example profile | Explicit jazz and study context remain central in every mode. A saved dislike for another genre has no effect on eligible jazz results. |
| P0-05 | “Music like Japanese Breakfast, but no country” | Example profile | Favor the named artist or closely relevant results, exclude country, and preserve the explicit negative constraint. |
| P0-06 | “Play ‘Dreams’ by Fleetwood Mac” | Example profile; run all modes | Exact song and artist intent take priority over favorite-genre injection and novelty. Return the requested track if Spotify has it. |
| P0-07 | “Spanish acoustic heartbreak songs, no Drake” | Example profile; run all modes | Respect Spanish language, acoustic/heartbreak intent, and exclude Drake. Do not let saved favorites override these constraints. |
| P0-08 | “Something good to listen to” | Empty profile; run all modes | Do not invent a specific activity or mood. Return a broad result or ask the user to refine; do not label arbitrary genre assumptions as explicit intent. |
| P0-09 | “Ambient focus music without vocals” | Empty profile | Favor instrumental ambient/focus candidates and exclude vocal-forward matches when the catalog metadata makes that distinction possible. |
| P0-10 | “Sad music, but not slow” | Empty profile | Preserve both signals: sad mood with a non-slow or varied tempo. Do not collapse the request into slow music solely because it is sad. |
| P0-11 | “Songs by Drake” | Example profile | The explicit current request overrides the saved Drake dislike for this search; the saved dislike remains unchanged afterward. |
| P0-12 | “Country music” | Example profile, with the country dislike enabled and no explicit override policy change | Exclude country. If no eligible candidates remain, return an honest empty/limited result instead of silently showing country or mock tracks. |
| P0-13 | “More like the last result” | Any profile, with prior result available | Use the prior result as context, keep existing hard constraints and dislikes, and avoid returning the same track again. |
| P0-14 | “Give me 90s Japanese jazz” | Example profile | Preserve the explicit decade, language/cultural intent, and jazz request as far as catalog evidence permits; explain if catalog metadata cannot verify the decade. |

## Review rubric

For each scenario, reviewers record:

1. **Constraint correctness:** Were explicit requests and exclusions honored?
2. **Mode distinction:** Did the mode change results in its intended direction without hijacking the prompt?
3. **Relevance:** Do the first five tracks fit the request?
4. **Variety:** Are there avoidable duplicate titles, versions, or repeated artists?
5. **Truthfulness:** Does the response accurately identify live versus mock data and explain sparse results?
6. **Repeatability:** Given the same request, preferences, candidate pool, and configuration, is the outcome acceptably stable?

Record a pass/fail and a short reason for each dimension. Do not require exact track matches because Spotify catalog results can change. Capture the baseline before modifying retrieval or ranking so later phases can compare behavior against it.

## Phase 0 exit criteria

- The team agrees on request precedence, hard constraints, soft preferences, and mode definitions above.
- The example profile and evaluation prompts are reviewed against actual product expectations.
- A baseline run is recorded for each prompt and mode combination where applicable.
- Any intentional policy changes are written here before implementation begins.

## Known evaluation limits

- Spotify catalog search is dynamic, so precise track-level results will vary over time.
- Track metadata may not reliably establish mood, tempo, vocal presence, language, or release era. Reviewers should mark metadata ambiguity instead of assuming the engine has evidence it does not receive.
- Browser-local preferences represent this device/profile only. This specification does not imply Spotify listening-history access or cross-device personalization.
