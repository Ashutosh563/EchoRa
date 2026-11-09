import type { Track } from "../../types/track.js";
import type { StageSonicProfile } from "../../types/transition.js";
import type { GeminiClient } from "../gemini/geminiClient.js";
import { getSongSignature } from "../music/fusion.js";

export interface TransitionStageContext {
  stage: number;
  mood: string;
  description: string;
  musicalCharacteristics: string[];
  energy?: number;
  valence?: number;
  sonicProfile?: StageSonicProfile;
  cumulativeArtistCounts?: Record<string, number>;
  excludeSignatures?: Set<string>;
  maxPerArtist?: number;
  maxCumulativePerArtist?: number;
  allowInstrumental?: boolean;
}

export interface TransitionReranker {
  rerankStage(
    candidates: Track[],
    context: TransitionStageContext,
    signal?: AbortSignal,
  ): Promise<Track[]>;
}

export function isHindiTrack(track: Track): boolean {
  const full = `${track.name} ${track.artists.join(" ")} ${track.album}`.toLowerCase();
  const hindiWords =
    /\b(tere|teri|tera|meri|mera|mere|tum|hum|dil|pyaar|pyar|ishq|mohabbat|zindagi|saath|raat|din|pal|khushi|gam|dard|aankhen|khwaab|yaad|yaadein|sanam|jaan|duniya|chura|tujhe|mujhko|humko|kabhi|kahin|kuch|hota|hai|yeh|woh|kaise|kyun|deewana|mastana|anjaana|bewafa|tanhai|judai|barsaat|baarish|hawa|suno|dekho|chalo|chal|bolly|bollywood|hindi|desi|sufi|ghazal|qawwali|channa|mereya|aashiqui|rabba|naina|jeena|saajna|piya|mahiya|dholna|kasam|dua|khuda|sajda|afreen|mitwa|kesariya|kalank|raataan|lambiyan|apna|bana|le|jhol|ehsaas|inaam|husn|baarishein|shayad|qaafirana|gerua|agar|shikayat|manjha|kasoor|kho gaye|baatein|rooh|sukoon|marham|khairiyat)\b/i;
  const hindiArtists =
    /\b(arijit singh|atif aslam|mohit chauhan|shreya ghoshal|kk|sonu nigam|rahat fateh|pritam|vishal|shekhar|ar rahman|a\.r\. rahman|anuv jain|prateek kuhad|mitraz|jasleen royal|b praak|jubin nautiyal|darshan raval|sachet|tandon|parampara|shankar|ehsaan|loy|amit trivedi|neha kakkar|badshah|king|divine|sidhu|armaan malik|amaal mallik|kishore kumar|mohammed rafi|lata mangeshkar|mukesh|rd burman|r\.d\. burman|jagjit singh|lucky ali|papon|shaan|sunidhi chauhan|alisha chinai|alka yagnik|udit narayan|kumar sanu)\b/i;

  return hindiWords.test(full) || hindiArtists.test(full);
}

export function isInstrumentalTrack(track: Track): boolean {
  const full = `${track.name} ${track.album}`.toLowerCase();
  return /\b(instrumental|karaoke|backing track|minus one|score|soundtrack suite|orchestral version|lofi beat|lo-fi beat|piano solo|guitar solo|bgm)\b/i.test(full);
}

const TRANSITION_RERANKER_SYSTEM = `You are ECHORA's Specialized Emotional Transition Reranker.
Your job is to evaluate and rank candidate musical tracks for an exact stage of a 4-stage emotional journey.

STAGE COMPOSITION RULES (MANDATORY):
Each 5-track stage MUST contain:
- 2 Hindi/Bollywood vocal songs
- 2 English/Western vocal songs
- 1 Choice song (best remaining Hindi or English vocal song, or at most 1 instrumental piece IF AND ONLY IF specifically required for this transition stage).
STRICT CEILING: Max 1 instrumental track in the entire 5-track stage! If an instrumental is not strictly required, do NOT include any instrumental.

EVALUATION CRITERIA:
1. Stage Alignment: How authentically does the track match the stage's emotional tone and description?
2. Language Balance: Classify and rank the highest quality Hindi vocal tracks and English vocal tracks.
3. Sonic & Acoustic Texture: Match the stage's acoustic palette, target energy (0.0 to 1.0), and valence (0.0 to 1.0).
4. Transition Bridge: Does the track smoothly bridge into and prepare the mood for the subsequent phase?

Output strict JSON with an array of ranked track IDs in descending order of fit, along with a concise 1-sentence reason.`;

const TRANSITION_RERANKER_SCHEMA = {
  type: "object",
  properties: {
    rankedTracks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  required: ["rankedTracks"],
};

export interface TransitionBalanceOptions {
  cumulativeArtistCounts?: Record<string, number>;
  maxPerArtist?: number;
  maxCumulativePerArtist?: number;
  excludeSignatures?: Set<string>;
  allowInstrumental?: boolean;
}

/**
 * Enforces the stage composition rule:
 * - 2 Hindi songs
 * - 2 English songs
 * - 1 Choice song (Hindi, English, or max 1 instrumental if allowed)
 * - Max 1 track per artist per stage
 * - Max 2 tracks per artist cumulative across all 4 stages
 * - Canonical signature deduplication across stages
 */
export function balanceTransitionTracks(
  orderedCandidates: Track[],
  targetCount: number = 5,
  options: TransitionBalanceOptions = {},
): Track[] {
  const maxPerArtist = options.maxPerArtist ?? 1;
  const maxCumulative = options.maxCumulativePerArtist ?? 2;
  const cumulative = options.cumulativeArtistCounts ?? {};
  const excludeSignatures = options.excludeSignatures ?? new Set<string>();
  const allowInstrumental = Boolean(options.allowInstrumental);

  // Group candidates into pools
  const hindiPool: Track[] = [];
  const englishPool: Track[] = [];
  const instrumentalPool: Track[] = [];

  for (const track of orderedCandidates) {
    if (isInstrumentalTrack(track)) {
      instrumentalPool.push(track);
    } else if (isHindiTrack(track)) {
      hindiPool.push(track);
    } else {
      englishPool.push(track);
    }
  }

  const stageArtistCounts: Record<string, number> = {};
  const stageSignatures = new Set<string>();
  const selected: Track[] = [];

  function trySelect(track: Track): boolean {
    const signature = getSongSignature(track);
    if (excludeSignatures.has(signature) || stageSignatures.has(signature)) {
      return false;
    }

    const primaryArtist = (track.artists[0] || "").toLowerCase().trim();
    const stageCount = stageArtistCounts[primaryArtist] || 0;
    const priorCumulative = cumulative[primaryArtist] || 0;

    if (stageCount >= maxPerArtist || priorCumulative + stageCount >= maxCumulative) {
      return false;
    }

    stageArtistCounts[primaryArtist] = stageCount + 1;
    stageSignatures.add(signature);
    selected.push(track);
    return true;
  }

  // 1. Select up to 2 Hindi vocal songs
  let hindiCount = 0;
  for (const track of hindiPool) {
    if (hindiCount >= 2) break;
    if (trySelect(track)) {
      hindiCount++;
    }
  }

  // 2. Select up to 2 English vocal songs
  let englishCount = 0;
  for (const track of englishPool) {
    if (englishCount >= 2) break;
    if (trySelect(track)) {
      englishCount++;
    }
  }

  // 3. Select 1 Choice track (can be Hindi, English, or max 1 instrumental if allowed)
  if (selected.length < targetCount) {
    let choiceAdded = false;

    // Only consider instrumental if allowInstrumental is specifically true
    if (allowInstrumental && instrumentalPool.length > 0) {
      for (const track of instrumentalPool) {
        if (trySelect(track)) {
          choiceAdded = true;
          break;
        }
      }
    }

    // Otherwise, select the next best vocal track from remaining candidates
    if (!choiceAdded) {
      for (const track of orderedCandidates) {
        if (selected.length >= targetCount) break;
        if (!isInstrumentalTrack(track)) {
          if (trySelect(track)) {
            break;
          }
        }
      }
    }
  }

  // 4. Fallback pass: fill remaining slots up to targetCount with any vocal tracks respecting artist caps
  if (selected.length < targetCount) {
    for (const track of orderedCandidates) {
      if (selected.length >= targetCount) break;
      if (!isInstrumentalTrack(track)) {
        trySelect(track);
      }
    }
  }

  // 5. Ultimate fallback if candidates are scarce: fill with remaining unique signatures (strictly max 1 instrumental)
  if (selected.length < targetCount) {
    const currentInstrumentals = selected.filter(isInstrumentalTrack).length;
    for (const track of orderedCandidates) {
      if (selected.length >= targetCount) break;
      const isInst = isInstrumentalTrack(track);
      if (isInst && currentInstrumentals >= 1) continue; // strictly max 1 instrumental!

      const signature = getSongSignature(track);
      if (excludeSignatures.has(signature) || stageSignatures.has(signature)) {
        continue;
      }

      const primaryArtist = (track.artists[0] || "").toLowerCase().trim();
      const priorCumulative = cumulative[primaryArtist] || 0;
      const stageCount = stageArtistCounts[primaryArtist] || 0;
      if (priorCumulative + stageCount >= maxCumulative) {
        continue;
      }

      stageArtistCounts[primaryArtist] = stageCount + 1;
      stageSignatures.add(signature);
      selected.push(track);
    }
  }

  return selected;
}

export function createTransitionReranker(
  geminiClient: GeminiClient | null,
): TransitionReranker {
  return {
    async rerankStage(
      candidates: Track[],
      context: TransitionStageContext,
      signal?: AbortSignal,
    ): Promise<Track[]> {
      if (!Array.isArray(candidates) || candidates.length === 0) {
        return [];
      }

      const targetCount = 5;
      const allowInstrumental = Boolean(
        context.allowInstrumental ?? context.sonicProfile?.allowInstrumental,
      );

      // Fallback if Gemini is unconfigured or candidates pool is small
      if (!geminiClient || candidates.length <= targetCount) {
        return balanceTransitionTracks(candidates, targetCount, {
          cumulativeArtistCounts: context.cumulativeArtistCounts,
          maxPerArtist: context.maxPerArtist ?? 1,
          maxCumulativePerArtist: context.maxCumulativePerArtist ?? 2,
          excludeSignatures: context.excludeSignatures,
          allowInstrumental,
        });
      }

      const candidateSummary = candidates.map((t, idx) => ({
        index: idx,
        id: t.id,
        name: t.name,
        artists: t.artists,
        album: t.album,
        isHindi: isHindiTrack(t),
        isInstrumental: isInstrumentalTrack(t),
      }));

      const userText = JSON.stringify({
        stage: {
          number: context.stage,
          mood: context.mood,
          description: context.description,
          musicalCharacteristics: context.musicalCharacteristics,
          targetEnergy: context.energy ?? 0.5,
          targetValence: context.valence ?? 0.5,
          sonicProfile: context.sonicProfile,
          compositionRequirement: "2 Hindi vocal songs, 2 English vocal songs, 1 Choice song (max 1 instrumental only if needed)",
        },
        candidates: candidateSummary,
      });

      try {
        const rawJson = await geminiClient.generateJson({
          userText,
          systemInstruction: TRANSITION_RERANKER_SYSTEM,
          jsonSchema: TRANSITION_RERANKER_SCHEMA,
          signal,
        });

        const parsed = JSON.parse(rawJson);
        const rankedIds: string[] = Array.isArray(parsed.rankedTracks)
          ? parsed.rankedTracks.map((r: any) => String(r.id))
          : [];

        // Build candidate map
        const trackMap = new Map<string, Track>();
        for (const t of candidates) {
          trackMap.set(t.id, t);
        }

        // Order candidates as Gemini ranked them
        const ordered: Track[] = [];
        const seen = new Set<string>();

        for (const id of rankedIds) {
          const track = trackMap.get(id);
          if (track && !seen.has(track.id)) {
            seen.add(track.id);
            ordered.push(track);
          }
        }

        // Append any unranked tracks to ensure pool is complete
        for (const track of candidates) {
          if (!seen.has(track.id)) {
            seen.add(track.id);
            ordered.push(track);
          }
        }

        return balanceTransitionTracks(ordered, targetCount, {
          cumulativeArtistCounts: context.cumulativeArtistCounts,
          maxPerArtist: context.maxPerArtist ?? 1,
          maxCumulativePerArtist: context.maxCumulativePerArtist ?? 2,
          excludeSignatures: context.excludeSignatures,
          allowInstrumental,
        });
      } catch (err) {
        // Fallback to balanced candidates
        return balanceTransitionTracks(candidates, targetCount, {
          cumulativeArtistCounts: context.cumulativeArtistCounts,
          maxPerArtist: context.maxPerArtist ?? 1,
          maxCumulativePerArtist: context.maxCumulativePerArtist ?? 2,
          excludeSignatures: context.excludeSignatures,
          allowInstrumental,
        });
      }
    },
  };
}
