import type { MusicIntent } from "../../types/intent.js";
import type { BrowserContext, ContextualListeningSignals } from "../../types/discovery.js";

const languageNames: Record<string, string> = {
  en: "english", hi: "hindi", es: "spanish", fr: "french", ja: "japanese",
  ko: "korean", ru: "russian", pa: "punjabi",
};
const highEnergy = /\b(energetic|high[- ]energy|fast|workout|dance|party|hype)\b/i;
const periodRelevant = /\b(calm|peaceful|relax|relaxing|meditat|ambient|focus|focused|study|sleep|unwind|gentle|quiet)\b/i;

export function enrichListeningContext(
  intent: MusicIntent,
  context?: BrowserContext,
): ContextualListeningSignals | undefined {
  if (!context) return undefined;
  const signals: ContextualListeningSignals = {};
  const period = context.dayPeriod;
  const explicitPeriod = intent.time_context && intent.time_context !== "any";
  const statedVibe = [intent.activity, intent.mood, intent.persona].filter(Boolean).join(" ");
  if (period && !explicitPeriod && intent.energy !== "high" && intent.tempo !== "fast" && periodRelevant.test(statedVibe) && !highEnergy.test(statedVibe)) {
    signals.dayPeriod = period;
  }
  if (!intent.language && context.languages?.length) {
    const code = context.languages[0].split(/[-_]/)[0].toLowerCase();
    if (languageNames[code]) signals.preferredLanguage = languageNames[code];
  }
  return Object.keys(signals).length ? signals : undefined;
}

export function contextualSearchQuery(signals?: ContextualListeningSignals): string | undefined {
  if (!signals?.dayPeriod) return undefined;
  const period = signals.dayPeriod?.replace("_", " ");
  // Keep retrieval cues anchored to an existing intent term; a language-only
  // query (such as "english") is too broad to be useful.
  const terms = [period, signals.preferredLanguage].filter(Boolean);
  return terms.length ? terms.join(" ") : undefined;
}
