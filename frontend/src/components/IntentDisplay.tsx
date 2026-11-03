import type { MusicIntent } from "../types/api";
import { humanize } from "../utils/format";

interface IntentDisplayProps {
  intent: MusicIntent;
}

/** Shows the interpreted intent as simple labelled fields. */
export function IntentDisplay({ intent }: IntentDisplayProps) {
  const fields: Array<[string, string]> = [
    ["Mood", humanize(intent.mood)],
    ["Activity", humanize(intent.activity)],
    ["Energy", humanize(intent.energy)],
    ["Genre", intent.genre.length ? intent.genre.map(humanize).join(", ") : "—"],
    ["Tempo preference", humanize(intent.tempo)],
    ["Vocal preference", humanize(intent.vocals)],
    ["Time context", humanize(intent.time_context)],
  ];

  return (
    <section className="intent" aria-labelledby="intent-heading">
      <h2 id="intent-heading">Interpreted intent</h2>
      <dl className="intent-grid">
        {fields.map(([label, value]) => (
          <div key={label} className="intent-field">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

