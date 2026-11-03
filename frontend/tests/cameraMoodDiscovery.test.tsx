import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import App from "../src/App";
import { createDeferredApi } from "./mocks/fakeApi";
import type { CameraAnalysisResponse } from "../src/types/camera";
import { CameraModal } from "../src/components/CameraModal";

describe("Camera-Based Mood Discovery (Mock-First Tests)", () => {
  let mockMediaDevices: any;

  beforeEach(() => {
    // Mock getUserMedia
    mockMediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    };
    Object.defineProperty(navigator, "mediaDevices", {
      value: mockMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Scenario A (HIGH confidence): automatically proceeds to recommendations with suggested music direction", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();

    const mockHighAnalysis: CameraAnalysisResponse = {
      expression: "happy-looking",
      confidence: "HIGH",
      image_quality: "GOOD",
      visual_observations: ["visible broad smile"],
      music_direction: "upbeat and cheerful acoustic pop music",
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          void fake.api.search(dir);
        }}
        analyzeImageFn={async () => mockHighAnalysis}
      />
    );

    // Wait for camera active state
    const analyzeBtn = await screen.findByRole("button", { name: "Analyze" });
    expect(analyzeBtn).toBeInTheDocument();

    // Click Analyze to capture and evaluate single frame
    await user.click(analyzeBtn);

    // CRITICAL: High confidence must directly dispatch to search without asking for confirmation
    expect(fake.calls).toEqual(["upbeat and cheerful acoustic pop music"]);
    // Must NOT display the medium confidence dropdown
    expect(screen.queryByLabelText(/select your mood/i)).not.toBeInTheDocument();
  });

  it("Scenario B (MEDIUM confidence): displays dropdown and respects user selected mood", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();

    const mockMediumAnalysis: CameraAnalysisResponse = {
      expression: "subtle / ambiguous smile",
      confidence: "MEDIUM",
      image_quality: "FAIR",
      visual_observations: ["partially relaxed face"],
      music_direction: "relaxed and balanced music",
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          void fake.api.search(dir);
        }}
        analyzeImageFn={async () => mockMediumAnalysis}
      />
    );

    const analyzeBtn = await screen.findByRole("button", { name: "Analyze" });
    await user.click(analyzeBtn);

    // Must NOT immediately auto-submit
    expect(fake.calls).toHaveLength(0);

    // Verifies the exact required message
    expect(
      screen.getByText(/We're not entirely sure about your expression. What kind of music are you in the mood for?/i)
    ).toBeInTheDocument();

    // Select "Calm / Peaceful" from dropdown (index 2)
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "2"); // Calm / Peaceful

    // Click Continue
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // User's selected mood must override Gemini's guess
    expect(fake.calls).toEqual(["peaceful and calm ambient music"]);
  });

  it("Scenario C (LOW confidence): displays 'Move to a better frame and try again.' and NEVER calls search", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();

    const mockLowAnalysis: CameraAnalysisResponse = {
      expression: "uncertain",
      confidence: "LOW",
      image_quality: "POOR",
      visual_observations: ["underexposed frame", "face not detected"],
      music_direction: null,
    };

    render(
      <CameraModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectMusicDirection={(dir) => {
          void fake.api.search(dir);
        }}
        analyzeImageFn={async () => mockLowAnalysis}
      />
    );

    const analyzeBtn = await screen.findByRole("button", { name: "Analyze" });
    await user.click(analyzeBtn);

    // Displays the exact required message
    expect(screen.getByText("Move to a better frame and try again.")).toBeInTheDocument();

    // Has Try Again button
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();

    // CRITICAL: LOW confidence must NEVER trigger recommendation search
    expect(fake.calls).toHaveLength(0);
  });

  it("Verifies camera button exists alongside text and mic input in App", async () => {
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    expect(screen.getByPlaceholderText("Something calm for a 3 AM study session...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start voice input/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discover music by facial expression" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
});
