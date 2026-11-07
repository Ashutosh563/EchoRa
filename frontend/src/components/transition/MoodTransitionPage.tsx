import { useEffect } from "react";
import { useMoodTransition } from "../../hooks/useMoodTransition";
import { MoodSelectorSection } from "./MoodSelectorSection";
import { JourneyReviewCard } from "./JourneyReviewCard";
import { LayeredPlaylistView } from "./LayeredPlaylistView";
import { ThinkingState } from "../ThinkingState";
import { ErrorCard } from "../ErrorCard";

export function MoodTransitionPage({ onMoodChange }: { onMoodChange?: (mood: string | undefined) => void }) {
  const {
    status,
    startingMood,
    destinationMood,
    stages,
    journey,
    error,
    selectStartingMood,
    selectDestinationMood,
    generatePlan,
    updateIntermediateMood,
    regenerateIntermediateMoods,
    approveAndGenerateMusic,
    reset,
  } = useMoodTransition();

  useEffect(() => {
    const paletteMood = status === "playlist" && journey
      ? journey.stages[Math.floor((journey.stages.length - 1) / 2)]?.mood || startingMood
      : status === "review"
      ? stages[1]?.mood || startingMood
      : startingMood || destinationMood || undefined;
    onMoodChange?.(paletteMood);
  }, [onMoodChange, status, startingMood, destinationMood, stages, journey]);

  if (status === "planning") {
    return (
      <div className="py-20 flex flex-col items-center">
        <ThinkingState />
        <p className="text-xs text-text-dim pt-4">
          Composing an emotional 4-stage bridge from {startingMood} to {destinationMood}...
        </p>
      </div>
    );
  }

  if (status === "generating") {
    return (
      <div className="py-20 flex flex-col items-center">
        <ThinkingState />
        <p className="text-xs text-text-dim pt-4">
          Searching Spotify tracks across all four approved journey stages...
        </p>
      </div>
    );
  }

  if (status === "error" && error) {
    return (
      <div className="py-12 max-w-xl mx-auto">
        <ErrorCard
          error={new Error(error)}
          onRetry={stages.length === 4 ? approveAndGenerateMusic : generatePlan}
        />
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-text-dim hover:text-text underline cursor-pointer"
          >
            Start over from mood selection
          </button>
        </div>
      </div>
    );
  }

  if (status === "playlist" && journey) {
    return <LayeredPlaylistView journey={journey} onReset={reset} />;
  }

  if (status === "review" && stages.length === 4) {
    return (
      <JourneyReviewCard
        startingMood={startingMood}
        destinationMood={destinationMood}
        stages={stages}
        onUpdateIntermediate={updateIntermediateMood}
        onRegenerateIntermediates={regenerateIntermediateMoods}
        onApproveAndGenerate={approveAndGenerateMusic}
        onBack={() => reset()}
        isLoading={false}
      />
    );
  }

  // Default: Selection View
  return (
    <MoodSelectorSection
      startingMood={startingMood}
      destinationMood={destinationMood}
      onSelectStarting={selectStartingMood}
      onSelectDestination={selectDestinationMood}
      onGenerate={generatePlan}
      isLoading={false}
      error={error}
    />
  );
}

