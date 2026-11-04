import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RefreshCw, AlertTriangle, Sparkles, Check } from 'lucide-react';
import type { CameraAnalysisResponse, CameraModalState } from '../types/camera';
import { MEDIUM_CONFIDENCE_MOOD_OPTIONS } from '../types/camera';
import { analyzeCameraImage } from '../api/client';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMusicDirection: (direction: string, result?: CameraAnalysisResponse) => void;
  /** Injected analyzer for tests or custom environments */
  analyzeImageFn?: (base64Image: string) => Promise<CameraAnalysisResponse>;
}

export function CameraModal({
  isOpen,
  onClose,
  onSelectMusicDirection,
  analyzeImageFn,
}: CameraModalProps) {
  const [modalState, setModalState] = useState<CameraModalState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CameraAnalysisResponse | null>(null);
  const [selectedMoodIndex, setSelectedMoodIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setModalState('requesting_permission');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMessage('Camera access is not supported in this browser or environment.');
      setModalState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setModalState('camera_active');
    } catch (err: unknown) {
      stopCameraStream();
      const errObj = err as { name?: string };
      if (errObj?.name === 'NotAllowedError' || errObj?.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (errObj?.name === 'NotFoundError' || errObj?.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware detected on this device.');
      } else {
        setErrorMessage('Could not start camera. Please check your permissions and try again.');
      }
      setModalState('error');
    }
  };

  // Lifecycle when opened / closed
  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCameraStream();
      setModalState('idle');
      setErrorMessage(null);
      setAnalysisResult(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setModalState('capturing');

    // Grab 1 frame using HTML Canvas
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

    // Turn off camera right after frame capture
    stopCameraStream();
    setModalState('analyzing');

    try {
      const result = analyzeImageFn
        ? await analyzeImageFn(base64Image)
        : await analyzeCameraImage(base64Image);

      setAnalysisResult(result);

      if (result.confidence === 'HIGH') {
        // High confidence: proceed directly to recommendations
        const direction = result.music_direction || 'peaceful and cheerful music';
        onSelectMusicDirection(direction, result);
        onClose();
      } else if (result.confidence === 'MEDIUM') {
        // Medium confidence: display clarification options
        setModalState('medium_selection');
      } else {
        // Low confidence: prompt user to re-frame
        setModalState('low_confidence');
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(errObj?.message || 'Failed to analyze expression. Please try again.');
      setModalState('error');
    }
  };

  const handleMediumContinue = () => {
    const chosen = MEDIUM_CONFIDENCE_MOOD_OPTIONS[selectedMoodIndex] || MEDIUM_CONFIDENCE_MOOD_OPTIONS[0];
    const finalDirection = chosen.direction;
    onSelectMusicDirection(finalDirection, analysisResult || undefined);
    onClose();
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setErrorMessage(null);
    void startCamera();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/35 backdrop-blur-xl saturate-150 transition-all duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#12121E]/75 backdrop-blur-2xl p-5 sm:p-6 rounded-[24px] border border-white/20 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet/20 border border-violet/30 text-violet">
                <Camera className="w-5 h-5 text-violet" />
              </div>
              <div>
                <h2 id="camera-modal-title" className="font-display font-semibold text-text text-base sm:text-lg">
                  Camera Mood Discovery
                </h2>
                <p className="text-xs text-text-dim">Discover music from your visible expression</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-text-faint hover:text-text hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close camera modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Live Camera Feed State */}
          {(modalState === 'camera_active' ||
            modalState === 'requesting_permission' ||
            modalState === 'capturing') && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Viewfinder brackets */}
                <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none">
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan" />
                </div>

                {modalState === 'requesting_permission' && (
                  <div className="absolute inset-0 bg-ink/40 backdrop-blur-md flex flex-col items-center justify-center gap-2 text-sm text-text-dim">
                    <span className="w-5 h-5 rounded-full border-2 border-cyan border-t-transparent animate-spin" />
                    <span>Requesting camera access…</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full glass-pill text-xs font-medium text-text-dim hover:text-text border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCaptureAndAnalyze}
                  disabled={modalState !== 'camera_active'}
                  aria-label="Analyze"
                  className={`px-5 py-2.5 rounded-full font-display font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                    modalState === 'camera_active'
                      ? 'bg-gradient-to-r from-violet via-magenta to-cyan text-white shadow-violet/30 hover:shadow-violet/50 hover:brightness-110 active:scale-95'
                      : 'bg-white/5 text-text-faint border border-white/5 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{modalState === 'capturing' ? 'Capturing…' : 'Analyze'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Analyzing State */}
          {modalState === 'analyzing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-5 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-gradient-to-r from-violet to-cyan blur-xl opacity-60 animate-pulse" />
                <div className="w-12 h-12 rounded-full border-3 border-cyan border-t-transparent animate-spin" />
              </div>
              <h3 className="font-display font-semibold text-base text-text mb-1">
                Analyzing Visible Expression
              </h3>
              <p className="text-xs text-text-dim max-w-xs">
                Google Gemini Vision is observing facial cues to recommend matching music…
              </p>
            </div>
          )}

          {/* 3. Medium Confidence State */}
          {modalState === 'medium_selection' && (
            <div className="py-2 space-y-4" role="region" aria-label="Confirm mood">
              <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-xs text-amber leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  We&apos;re not entirely sure about your expression. What kind of music are you in the mood for?
                </p>
              </div>

              {/* Selection Options */}
              <div className="space-y-2">
                <label htmlFor="mood-dropdown" className="text-xs font-medium text-text-dim block">
                  Select your current mood vibe:
                </label>
                <div className="relative mb-2">
                  <select
                    id="mood-dropdown"
                    role="combobox"
                    aria-label="Select your mood"
                    value={selectedMoodIndex}
                    onChange={(e) => setSelectedMoodIndex(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl glass-panel text-xs sm:text-sm font-medium text-text bg-ink/90 border border-white/10 outline-none focus:border-cyan cursor-pointer"
                  >
                    {MEDIUM_CONFIDENCE_MOOD_OPTIONS.map((opt, idx) => (
                      <option key={opt.label} value={idx} className="bg-ink text-text">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {MEDIUM_CONFIDENCE_MOOD_OPTIONS.map((opt, idx) => {
                    const isSelected = selectedMoodIndex === idx;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setSelectedMoodIndex(idx)}
                        className={`p-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? 'bg-violet/20 border-violet/50 text-white shadow-sm shadow-violet/20'
                            : 'glass-panel border-white/5 text-text-dim hover:text-text hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-cyan" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full glass-pill text-xs font-medium text-text-dim hover:text-text border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMediumContinue}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-violet to-magenta text-white font-semibold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* 4. Low Confidence State */}
          {modalState === 'low_confidence' && (
            <div className="py-4 space-y-4" role="alert">
              <div className="p-4 rounded-xl bg-amber/10 border border-amber/30 text-amber text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber" />
                <div>
                  <p className="font-semibold text-text mb-0.5">Move to a better frame and try again.</p>
                  {analysisResult?.visual_observations?.length ? (
                    <p className="text-text-dim text-xs mt-1">
                      Observations: {analysisResult.visual_observations.join(', ')}
                    </p>
                  ) : (
                    <p className="text-text-dim text-xs mt-1">
                      The lighting may be low or the face was not clearly visible in the frame.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full glass-pill text-xs font-medium text-text-dim hover:text-text border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-violet to-cyan text-white font-semibold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-95 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Error State */}
          {modalState === 'error' && (
            <div className="py-4 space-y-4" role="alert">
              <div className="p-4 rounded-xl bg-error-status/10 border border-error-status/25 text-error-status text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-text mb-0.5">Camera Error</p>
                  <p className="text-text-dim text-xs">
                    {errorMessage || 'Unable to access camera. Please check camera permissions.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full glass-pill text-xs font-medium text-text-dim hover:text-text border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-5 py-2 rounded-full bg-white/10 text-text hover:text-white hover:bg-white/15 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
