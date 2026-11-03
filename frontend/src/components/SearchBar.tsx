import type { FormEvent } from "react";

export const MAX_PROMPT_LENGTH = 300;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/** Text input + Search button. Enter key submits via native form submission. */
export function SearchBar({ value, onChange, onSubmit, disabled = false }: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <label htmlFor="prompt" className="visually-hidden">
        Describe the music you want
      </label>
      <input
        id="prompt"
        type="text"
        value={value}
        maxLength={MAX_PROMPT_LENGTH}
        placeholder="Something calm for a 3 AM study session..."
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button type="submit" disabled={disabled}>
        {disabled ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

