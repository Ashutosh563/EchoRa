/** Web Speech API typing and interface declarations */

export type SpeechRecognitionState = "idle" | "listening" | "processing" | "error";

export interface SpeechRecognitionHookResult {
  isSupported: boolean;
  state: SpeechRecognitionState;
  isListening: boolean;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
}

