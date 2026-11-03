import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResponse } from "../types/api";
import { MusicApiError, type MusicApi } from "../api/musicApi";

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: SearchResponse }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Something went wrong while searching. Please try again.";

/** Manages a single search request lifecycle; ignores stale responses. */
export function useMusicSearch(api: MusicApi) {
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const search = useCallback(
    async (prompt: string) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState({ status: "loading" });

      try {
        const data = await api.search(prompt, controller.signal);
        if (!controller.signal.aborted) setState({ status: "success", data });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof MusicApiError ? err.message : GENERIC_ERROR;
        setState({ status: "error", message });
      }
    },
    [api],
  );

  return { state, search };
}

