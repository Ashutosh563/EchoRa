import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import App from "../src/App";
import { createDeferredApi } from "./mocks/fakeApi";

// Mock Web Speech Recognition implementation
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    if (this.onstart) this.onstart();
  }

  stop() {
    if (this.onend) this.onend();
  }

  abort() {
    if (this.onend) this.onend();
  }

  // Test helper to simulate speech transcription event
  simulateSpeech(transcript: string, isFinal = true) {
    if (this.onresult) {
      this.onresult({
        resultIndex: 0,
        results: [
          {
            0: { transcript },
            isFinal,
            length: 1,
          },
        ],
      });
    }
    if (isFinal && this.onend) {
      this.onend();
    }
  }
}

describe("Voice Input Integration", () => {
  let activeMockRecognition: MockSpeechRecognition | null = null;

  beforeEach(() => {
    activeMockRecognition = null;
    (window as any).SpeechRecognition = function () {
      activeMockRecognition = new MockSpeechRecognition();
      return activeMockRecognition;
    };
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  it("Test 1: transcribes speech into the input field without auto-submitting", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    const micButton = screen.getByRole("button", { name: /start voice input/i });
    expect(micButton).toBeInTheDocument();

    // Click microphone to begin voice input
    await user.click(micButton);
    expect(activeMockRecognition).not.toBeNull();

    // Simulate speech from user
    act(() => {
      activeMockRecognition?.simulateSpeech("peaceful study music without lyrics", true);
    });

    const input = screen.getByPlaceholderText("Something calm for a 3 AM study session...");
    // Check transcription populated input
    expect(input).toHaveValue("peaceful study music without lyrics");

    // CRITICAL REQUIREMENT: Must not automatically submit upon transcription
    expect(fake.calls).toHaveLength(0);
  });

  it("Test 2: allows user to edit recognized transcript before manually submitting search", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    // Click mic and simulate spoken input
    await user.click(screen.getByRole("button", { name: /start voice input/i }));
    act(() => {
      activeMockRecognition?.simulateSpeech("calm piano music", true);
    });

    const input = screen.getByPlaceholderText("Something calm for a 3 AM study session...");
    expect(input).toHaveValue("calm piano music");

    // User edits the transcript by typing additional constraints
    await user.type(input, " for studying");
    expect(input).toHaveValue("calm piano music for studying");

    // Still not submitted before explicit user action
    expect(fake.calls).toHaveLength(0);

    // User explicitly clicks Search to submit
    await user.click(screen.getByRole("button", { name: "Search" }));

    // Request is dispatched through the existing search handler
    expect(fake.calls).toEqual(["calm piano music for studying"]);
  });
});
