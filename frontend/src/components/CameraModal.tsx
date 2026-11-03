import { useEffect, useRef, useState } from "react";
import type { CameraAnalysisResponse, CameraModalState } from "../types/camera";
import { MEDIUM_CONFIDENCE_MOOD_OPTIONS } from "../types/camera";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMusicDirection: (direction: string) => void;
  /** Injected analyzer for tests or custom environments */
  analyzeImageFn?: (base64Image: string) => Promise<CameraAnalysisResponse>;
}

export function CameraModal({
  isOpen,
  onClose,
  onSelectMusicDirection,
  analyzeImageFn,
}: CameraModalProps) {
  const [modalState, setModalState] = useState<CameraModalState>("idle");
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
    setModalState("requesting_permission");

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMessage("Camera access is not supported in this browser or environment.");
      setModalState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setModalState("camera_active");
    } catch (err: any) {
      stopCameraStream();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings.");
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware detected on this device.");
      } else {
        setErrorMessage("Could not start camera. Please check your permissions and try again.");
      }
      setModalState("error");
    }
  };

  // Open / Close lifecycle
  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopCameraStream();
      setModalState("idle");
      setErrorMessage(null);
      setAnalysisResult(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen]);

  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setModalState("capturing");

    // Grab 1 frame using HTML Canvas
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    const base64Data = canvas.toDataURL ? canvas.toDataURL("image/jpeg", 0.85) : "data:image/jpeg;base64,mockframe";

    // Stop camera immediately after capturing 1 frame
    stopCameraStream();
    setModalState("analyzing");

    try {
      let result: CameraAnalysisResponse;
      if (analyzeImageFn) {
        result = await analyzeImageFn(base64Data);
      } else {
        const res = await fetch("/api/music/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, mimeType: "image/jpeg" }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to analyze camera image.");
        }
        result = await res.json();
      }

      setAnalysisResult(result);

      // Decision System Handling:
      if (result.confidence === "HIGH") {
        // High confidence: Automatically proceed to recommendations with suggested music direction
        const direction = result.music_direction || "peaceful and cheerful music";
        onSelectMusicDirection(direction);
        onClose();
      } else if (result.confidence === "MEDIUM") {
        // Medium confidence: User selects their preferred mood
        setModalState("medium_selection");
      } else {
        // Low confidence: Display exact required message and do NOT trigger recommendations
        setModalState("low_confidence");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Analysis failed. Please try again or type your request.");
      setModalState("error");
    }
  };

  const handleMediumContinue = () => {
    const chosen = MEDIUM_CONFIDENCE_MOOD_OPTIONS[selectedMoodIndex] || MEDIUM_CONFIDENCE_MOOD_OPTIONS[0];
    onSelectMusicDirection(chosen!.direction);
    onClose();
  };

  const handleTryAgain = () => {
    setAnalysisResult(null);
    setErrorMessage(null);
    void startCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">
      <div className="camera-modal-card">
        <h2 id="camera-modal-title" className="camera-modal-title">
          Camera Mood Discovery
        </h2>

        {/* Live Camera Feed State */}
        {(modalState === "camera_active" || modalState === "requesting_permission" || modalState === "capturing") && (
          <div className="camera-preview-container">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video-feed" />
            <div className="camera-framing-box" aria-hidden="true" />
            {modalState === "requesting_permission" && (
              <p className="camera-status-overlay">Requesting camera access…</p>
            )}
            <div className="camera-modal-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleCaptureAndAnalyze}
                disabled={modalState !== "camera_active"}
              >
                {modalState === "capturing" ? "Capturing…" : "Analyze"}
              </button>
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Analyzing Spinner State */}
        {modalState === "analyzing" && (
          <div className="camera-analyzing-state">
            <span className="spinner" aria-hidden="true" />
            <p>Interpreting visible facial expression…</p>
          </div>
        )}

        {/* MEDIUM Confidence: Ask user to select preferred mood */}
        {modalState === "medium_selection" && (
          <div className="camera-medium-state" role="region" aria-label="Confirm mood">
            <p className="camera-uncertain-msg">
              We&apos;re not entirely sure about your expression. What kind of music are you in the mood for?
            </p>
            <div className="camera-dropdown-wrapper">
              <label htmlFor="mood-dropdown" className="visually-hidden">
                Select your mood
              </label>
              <select
                id="mood-dropdown"
                value={selectedMoodIndex}
                onChange={(e) => setSelectedMoodIndex(Number(e.target.value))}
                className="camera-mood-select"
              >
                {MEDIUM_CONFIDENCE_MOOD_OPTIONS.map((opt, idx) => (
                  <option key={opt.label} value={idx}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="camera-modal-actions">
              <button type="button" className="btn btn--primary" onClick={handleMediumContinue}>
                Continue
              </button>
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LOW Confidence: Exactly required message + Try Again */}
        {modalState === "low_confidence" && (
          <div className="camera-low-state" role="alert">
            <p className="camera-low-msg">Move to a better frame and try again.</p>
            {analysisResult?.visual_observations?.length ? (
              <p className="camera-subtext">Reason: {analysisResult.visual_observations.join(", ")}</p>
            ) : null}
            <div className="camera-modal-actions">
              <button type="button" className="btn btn--primary" onClick={handleTryAgain}>
                Try Again
              </button>
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {modalState === "error" && (
          <div className="camera-error-state" role="alert">
            <p className="message message--error">{errorMessage || "An error occurred."}</p>
            <div className="camera-modal-actions">
              <button type="button" className="btn btn--primary" onClick={handleTryAgain}>
                Try Again
              </button>
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
