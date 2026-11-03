import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechRecognitionHookResult, SpeechRecognitionState } from "../types/speech";

interface UseSpeechRecognitionOptions {
  onTranscriptChange: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

// Browser API declaration
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useSpeechRecognition({
  onTranscriptChange,
  lang = "en-US",
}: UseSpeechRecognitionOptions): SpeechRecognitionHookResult {
  const [state, setState] = useState<SpeechRecognitionState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isManuallyStoppedRef = useRef(false);

  // Feature detection
  const SpeechRecognitionApi =
    typeof window !== "undefined"
      ? (window as unknown as IWindow).SpeechRecognition ||
        (window as unknown as IWindow).webkitSpeechRecognition
      : undefined;

  const isSupported = Boolean(SpeechRecognitionApi);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setState("idle");
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionApi) {
      setErrorMessage("Speech recognition is not supported in this browser. Please type your request.");
      setState("error");
      return;
    }

    setErrorMessage(null);
    isManuallyStoppedRef.current = false;

    // Clean up any ongoing session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
    }

    try {
      const recognition = new SpeechRecognitionApi();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setState("listening");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();
        if (combined) {
          onTranscriptChange(combined, Boolean(finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        if (err === "no-speech") {
          // Graceful no-speech handling
          setErrorMessage("No speech was detected. Tap the mic to try again.");
        } else if (err === "not-allowed" || err === "service-not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions in your browser.");
        } else if (err === "audio-capture") {
          setErrorMessage("No microphone found. Please connect a microphone and try again.");
        } else if (err === "network") {
          setErrorMessage("Network error during speech recognition. Please check your connection.");
        } else {
          setErrorMessage("Could not transcribe speech. Please try speaking again or type your request.");
        }
        setState("error");
      };

      recognition.onend = () => {
        setState("idle");
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setErrorMessage("Could not start microphone. Please try again.");
      setState("error");
    }
  }, [SpeechRecognitionApi, lang, onTranscriptChange]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    isSupported,
    state,
    isListening: state === "listening",
    errorMessage,
    startListening,
    stopListening,
  };
}

