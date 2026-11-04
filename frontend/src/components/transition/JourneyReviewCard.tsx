import { useState } from "react";
import { Sparkles, ArrowRight, RotateCw, CheckCircle2, Edit3, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import type { MoodStage } from "../../types/transition";

interface JourneyReviewCardProps {
  startingMood: string;
  destinationMood: string;
  stages: MoodStage[];
  onUpdateIntermediate: (stageNumber: 2 | 3, newMood: string) => void;
  onRegenerateIntermediates: () => void;
  onApproveAndGenerate: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function JourneyReviewCard({
  startingMood,
  destinationMood,
  stages,
  onUpdateIntermediate,
  onRegenerateIntermediates,
  onApproveAndGenerate,
  onBack,
  isLoading,
}: JourneyReviewCardProps) {
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

  const handleStartEdit = (stageNum: number, currentMood: string) => {
    setEditingStage(stageNum);
    setEditText(currentMood);
  };

  const handleSaveEdit = (stageNum: number) => {
    if (stageNum === 2 || stageNum === 3) {
      onUpdateIntermediate(stageNum, editText);
    }
    setEditingStage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs text-text-dim hover:text-text mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change moods</span>
          </button>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-text">
            Review Your Journey:{" "}
            <span className="text-violet">{startingMood}</span> →{" "}
            <span className="text-cyan">{destinationMood}</span>
          </h2>
          <p className="text-xs sm:text-sm text-text-dim pt-1">
            Review and personalize the transitional emotional stepping stones before generating music.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerateIntermediates}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-full glass-pill text-xs font-semibold text-text-dim hover:text-text hover:bg-white/10 flex items-center gap-2 border border-white/10 transition-all cursor-pointer self-start sm:self-center"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Regenerate Steps</span>
        </button>
      </div>

      {/* 4 Stages Progression Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {stages.map((stage) => {
          const isIntermediate = stage.stage === 2 || stage.stage === 3;
          const isEditing = editingStage === stage.stage;

          // Distinct color accents per stage
          const accentColor =
            stage.stage === 1
              ? "border-violet/40 bg-violet/10 text-violet"
              : stage.stage === 2
              ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-400"
              : stage.stage === 3
              ? "border-cyan/40 bg-cyan/10 text-cyan"
              : "border-magenta/40 bg-magenta/10 text-magenta";

          return (
            <motion.div
              key={`stage-${stage.stage}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stage.stage * 0.1 }}
              className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 relative"
            >
              {/* Stage Badge & Label */}
              <div>
                <div className="flex items-center justify-between pb-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${accentColor} font-bold`}>
                    Stage 0{stage.stage}
                  </span>

                  {isIntermediate && !isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(stage.stage, stage.mood)}
                      className="text-text-faint hover:text-text transition-colors cursor-pointer"
                      title="Edit intermediate mood"
                      aria-label={`Edit intermediate mood for stage ${stage.stage}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mood Title or Inline Edit */}
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEdit(stage.stage);
                    }}
                    className="space-y-2 pt-1"
                  >
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      className="w-full px-2.5 py-1 rounded bg-white/10 border border-white/20 text-xs text-text focus:outline-none focus:border-violet"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="submit"
                        className="px-2 py-0.5 rounded bg-violet text-[11px] font-medium text-white cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStage(null)}
                        className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-medium text-text-dim cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <h3 className="font-display font-bold text-lg text-text">
                      {stage.mood}
                    </h3>
                    <p className="text-xs text-text-dim line-clamp-3 pt-1">
                      {stage.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Musical Characteristics Chips */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <span className="text-[10px] font-mono text-text-faint uppercase tracking-wider block">
                  Musical Vibe
                </span>
                <div className="flex flex-wrap gap-1">
                  {stage.musicalCharacteristics.map((char) => (
                    <span
                      key={char}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-dim border border-white/5"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Approval & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-text-dim">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Approve this progression to generate up to 20 stage-tailored tracks.</span>
        </div>

        <motion.button
          type="button"
          onClick={onApproveAndGenerate}
          disabled={isLoading}
          whileTap={!isLoading ? { scale: 0.98 } : undefined}
          className="px-8 py-3 rounded-full font-display font-bold text-sm bg-gradient-to-r from-violet via-fuchsia-500 to-cyan text-white shadow-lg shadow-violet/30 hover:brightness-110 flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoading ? "Searching Spotify tracks..." : "Approve & Generate Music"}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

