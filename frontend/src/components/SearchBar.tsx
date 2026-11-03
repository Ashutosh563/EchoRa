import type { FormEvent } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

export const MAX_PROMPT_LENGTH = 300;

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  onVoiceError?: (error: string | null) => void;
}

/**
 * Text input with microphone button for optional speech-to-text.
 * Enter key or clicking Search submits via existing form submission.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  disabled = false,
  onVoiceError,
}: SearchBarProps) {
  const { isSupported, isListening, errorMessage, startListening, stopListening } =
    useSpeechRecognition({
      onTranscriptChange: (transcript) => {
        onChange(transcript.slice(0, MAX_PROMPT_LENGTH));
        if (onVoiceError) onVoiceError(null);
      },
    });

  // Relay speech error messages up if prop provided
  if (errorMessage && onVoiceError) {
    onVoiceError(errorMessage);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isListening) {
      stopListening();
    }
    onSubmit();
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <label htmlFor="prompt" className="visually-hidden">
        Describe the music you want
      </label>
      <div className="search-input-wrapper">
        <input
          id="prompt"
          type="text"
          value={value}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder="Something calm for a 3 AM study session..."
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />

        <button
          type="button"
          className={`mic-button ${isListening ? "mic-button--listening" : ""}`}
          onClick={handleMicClick}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          title={
            !isSupported
              ? "Speech recognition is not supported in this browser"
              : isListening
                ? "Listening... Click to stop"
                : "Speak your music request"
          }
          aria-pressed={isListening}
        >
          <svg
            className="mic-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
      </div>

      <button type="submit" disabled={disabled}>
        {disabled ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
