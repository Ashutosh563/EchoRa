export const EXAMPLE_PROMPTS = [
  "Energetic music for a workout.",
  "Peaceful music for studying.",
  "Melancholic songs for a rainy evening.",
  "Happy acoustic music.",
];

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

/** Clickable example prompts; clicking one populates the search input. */
export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  return (
    <div className="examples">
      <span className="examples-label">Try:</span>
      {EXAMPLE_PROMPTS.map((prompt) => (
        <button key={prompt} type="button" className="chip" onClick={() => onSelect(prompt)}>
          {prompt}
        </button>
      ))}
    </div>
  );
}

