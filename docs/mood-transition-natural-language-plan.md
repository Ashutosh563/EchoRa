# Mood Transition: Natural Language Input Plan

## Goal

Let users start a mood journey either by choosing the existing starting and destination mood presets or by describing the change they want in a short text prompt. Keep both paths available and converge them on the current four-stage journey review and playlist flow.

Example: “I’m overwhelmed after work and want to feel calm but still focused.” The system should identify an understandable current mood and a desired mood, show both to the user for correction, and only then build the transition.

## Feasibility and current architecture

This is feasible with the existing stack and provider setup:

- The transition UI is in `frontend/src/components/transition/MoodTransitionPage.tsx` and `MoodSelectorSection.tsx`; its hook stores two mood strings and submits them to the planner.
- `POST /api/transition/plan` validates `startingMood` and `destinationMood`, then `TransitionPlanner.plan()` produces the four stages. The planner already accepts free-form mood labels up to 50 characters.
- The project already calls Gemini for structured JSON and optionally falls back to OpenAI for Discovery intent extraction. However, the Discovery extractor's `MusicIntent` schema is designed for music search, not reliably extracting a pair of mood endpoints. A dedicated transition-intent schema/prompt is the cleaner reuse boundary.
- No database migration is needed: the interpreted endpoints can remain client state and flow into existing plan and music endpoints.

## Proposed experience

1. Add a clear mode choice or two visibly equal input paths: **Choose moods** (the current preset cards) and **Describe your transition** (a short text area with an example prompt).
2. On submit, send the prompt to a new transition interpretation endpoint.
3. Return structured `startingMood`, `destinationMood`, a concise interpretation summary, and a confidence/needs-clarification signal.
4. Show the extracted endpoints as editable fields/chips using the existing preset options as suggestions. Do not auto-generate the journey before the user can review the interpretation.
5. If the prompt omits one endpoint or is ambiguous, ask a focused follow-up in the UI; let users complete or edit the pair.
6. After confirmation, reuse the existing plan, intermediate-stage review, and generate-music flow unchanged.

## Implementation phases

### Phase 1: Input and interaction design

- Preserve the current two-preset workflow.
- Add an accessible text-input path, loading state, character limit, example prompts, and inline validation/error states.
- Present interpreted start and destination moods as editable values with preset suggestions.
- Keep selection and text paths synchronized so editing either path updates the same two canonical mood values.

### Phase 2: Backend intent interpretation

- Add a `TransitionIntentExtractor` service with a strict JSON schema for `startingMood`, `destinationMood`, optional short `interpretation`, and a clarification state/reason.
- Wire it to the configured Gemini client and, where practical, the existing OpenAI JSON client fallback. Keep provider errors explicit and avoid silently inventing missing endpoints.
- Add a validated `POST /api/transition/interpret` route with bounded prompt length and a response type.
- Validate and normalize extracted moods (non-empty, bounded length, distinct); return a clarification result when the model cannot confidently identify both endpoints.
- Keep the existing `/plan` API contract stable.

### Phase 3: Frontend integration

- Add an API helper and hook action for interpretation.
- Add an interpretation status and state to the transition hook, with cancellation/cleanup for stale requests.
- Route successful interpretations into the editable review form; route clarification responses to a concise follow-up state.
- On user confirmation, call the existing `generatePlan()` logic so both entry paths converge.
- Keep the confirmation-before-playlist generation behavior already present in the journey review.

### Phase 4: Resilience, accessibility, and evaluation

- Provide keyboard-operable mode controls, labelled textarea, screen-reader announcements for loading/errors, and visible focus states.
- Handle provider unavailable, malformed JSON, duplicate endpoints, low confidence, and prompts that express only a target or only a current mood.
- Add backend and frontend tests for valid extraction, ambiguity/clarification, validation bounds, provider fallback/error, manual preset regression, endpoint correction, and unchanged journey generation.
- Evaluate representative prompts (direct, indirect, negated, mixed emotion, and missing endpoint) before enabling text input by default.

## API sketch

`POST /api/transition/interpret`

Request:

```json
{ "prompt": "I'm tense after a long day and want to unwind without getting sleepy" }
```

Response when endpoints are clear:

```json
{
  "status": "ready",
  "startingMood": "Tense",
  "destinationMood": "Relaxed and alert",
  "interpretation": "A shift from post-work tension toward calm focus"
}
```

Response needing clarification:

```json
{
  "status": "clarification_needed",
  "startingMood": null,
  "destinationMood": "Calm",
  "interpretation": "The desired mood is clear, but the current mood is not."
}
```

## Key decisions and safeguards

- Treat this as structured intent extraction, not free-form chat or an open-ended assistant. The user is expressing endpoints for the existing transition product.
- Always let the user inspect and correct extracted endpoints before planning.
- Preserve meaningful modifiers such as “calm but focused”; avoid forcing every description into a preset vocabulary.
- Keep the preset path fully usable without an AI provider.
- Bound prompt size and endpoint sizes; do not log raw emotional prompts by default.
- Clarify cost/latency tradeoffs against the existing configured providers during implementation.

## Definition of done

- Users can complete a journey with presets exactly as before.
- Users can describe a transition in natural language, review/edit the extracted endpoint moods, and build a journey through the existing stage review and music generation flow.
- Ambiguous input asks for clarification instead of guessing silently.
- Relevant automated tests and typechecks pass; do a browser visual check during review.

## Implementation status

- [x] Added the natural-language composer with Discover's glass panel, focused aurora edge, and gradient action treatment.
- [x] Added structured transition interpretation at `POST /api/transition/interpret` with Gemini primary and configured OpenAI fallback.
- [x] Added bounded prompt validation, endpoint normalization, and clarification responses for missing or identical moods.
- [x] Added an editable endpoint review with the existing presets as a second path; both paths continue through the existing four-stage planner.
- [x] Added integration and unit coverage for validation, parsing, provider fallback, ambiguity, and the frontend interpretation-to-review flow.
- [x] Refined manual selection into a guided two-step flow and added gradual mood tint transitions with reduced-motion-aware aurora drift.
