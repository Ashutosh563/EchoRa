import { useEffect, useMemo, useState } from "react";
import type { MusicApi } from "./api/musicApi";
import { createHttpMusicClient, type FullMusicApi } from "./api/httpClient";
import { useMusicSearch } from "./hooks/useMusicSearch";
import { SearchBar } from "./components/SearchBar";
import { ExamplePrompts } from "./components/ExamplePrompts";
import { IntentDisplay } from "./components/IntentDisplay";
import { TrackList } from "./components/TrackList";
import { StatusBar } from "./components/StatusBar";
import { CameraModal } from "./components/CameraModal";
import type { StatusResponse } from "./types/api";

interface AppProps {
  /** Injected data source; defaults to backend HTTP client. */
  api?: MusicApi;
}

export default function App({ api }: AppProps) {
  const client = useMemo(() => api ?? createHttpMusicClient(), [api]);
  const { state, search } = useMusicSearch(client);
  const [prompt, setPrompt] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    // If client supports getStatus, load initial backend mode
    if ("getStatus" in client && typeof (client as FullMusicApi).getStatus === "function") {
      (client as FullMusicApi).getStatus().then(setStatus).catch(() => {});
    }
  }, [client]);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setValidationError("Please describe what you'd like to listen to.");
      return;
    }
    setValidationError(null);
    void search(trimmed);
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (validationError) setValidationError(null);
  };

  const handleCameraDirection = (direction: string) => {
    setPrompt(direction);
    if (validationError) setValidationError(null);
    void search(direction);
  };

  const isLoading = state.status === "loading";

  return (
    <main className="app">
      <header className="header">
        <h1>SONORA</h1>
        <p className="tagline">AI-powered mood-based music discovery.</p>
      </header>

      <StatusBar status={status} />

      <SearchBar
        value={prompt}
        onChange={handlePromptChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
        onVoiceError={setVoiceError}
        onOpenCamera={() => setIsCameraOpen(true)}
      />
      <ExamplePrompts onSelect={handlePromptChange} />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSelectMusicDirection={handleCameraDirection}
      />

      {voiceError && (
        <p className="message message--error" role="alert">
          {voiceError}
        </p>
      )}

      {validationError && (
        <p className="message message--error" role="alert">
          {validationError}
        </p>
      )}

      {isLoading && (
        <p className="message message--loading" role="status">
          <span className="spinner" aria-hidden="true" /> Interpreting your request and finding music…
        </p>
      )}

      {state.status === "error" && (
        <p className="message message--error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === "success" && (
        <>
          {state.data.notice && <p className="message message--notice">{state.data.notice}</p>}
          <IntentDisplay intent={state.data.intent} />
          <TrackList tracks={state.data.tracks} mode={state.data.mode} />
        </>
      )}
    </main>
  );
}
