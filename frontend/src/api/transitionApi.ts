import { AppApiError } from "./client";
import type {
  MoodStage,
  TransitionJourneyResponse,
  TransitionPlanResponse,
} from "../types/transition";

interface ErrorResponseBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = "TRANSITION_ERROR";
    let message = "An error occurred during the transition workflow.";

    try {
      const data = (await res.json()) as ErrorResponseBody;
      if (data?.error?.code) code = data.error.code;
      if (data?.error?.message) message = data.error.message;
    } catch {
      message = `HTTP error ${res.status}: ${res.statusText}`;
    }

    throw new AppApiError(code, message);
  }

  return (await res.json()) as T;
}

export async function planTransition(
  startingMood: string,
  destinationMood: string,
  signal?: AbortSignal,
): Promise<TransitionPlanResponse> {
  try {
    const res = await fetch("/api/transition/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingMood, destinationMood }),
      signal,
    });
    return await handleResponse<TransitionPlanResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new AppApiError("NETWORK_ERROR", "Could not reach SONORA transition planner.");
  }
}

export async function generateTransitionMusic(
  startingMood: string,
  destinationMood: string,
  stages: MoodStage[],
  signal?: AbortSignal,
): Promise<TransitionJourneyResponse> {
  try {
    const res = await fetch("/api/transition/generate-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingMood, destinationMood, stages }),
      signal,
    });
    return await handleResponse<TransitionJourneyResponse>(res);
  } catch (err: unknown) {
    if (err instanceof AppApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new AppApiError("NETWORK_ERROR", "Could not reach SONORA music generator.");
  }
}

