import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import * as transitionApi from "../src/api/transitionApi";
import type {
  TransitionJourneyResponse,
  TransitionPlanResponse,
} from "../src/types/transition";

describe("Mood Transition UI Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockPlan: TransitionPlanResponse = {
    stages: [
      {
        stage: 1,
        mood: "Sad",
        description: "Embracing sadness",
        musicalCharacteristics: ["melancholic", "acoustic"],
      },
      {
        stage: 2,
        mood: "Reflective",
        description: "Contemplative transition",
        musicalCharacteristics: ["mellow"],
      },
      {
        stage: 3,
        mood: "Hopeful",
        description: "Growing warmth",
        musicalCharacteristics: ["warm", "melodic"],
      },
      {
        stage: 4,
        mood: "Happy",
        description: "Vibrant arrival",
        musicalCharacteristics: ["upbeat", "energetic"],
      },
    ],
  };

  const mockJourney: TransitionJourneyResponse = {
    startingMood: "Sad",
    destinationMood: "Happy",
    stages: mockPlan.stages.map((s) => ({
      ...s,
      tracks: [
        {
          id: `t-${s.stage}-1`,
          name: `${s.mood} Song 1`,
          artists: ["Test Artist"],
          album: "Test Album",
          albumArtUrl: null,
          durationMs: 180000,
          spotifyUrl: "https://spotify.com",
          previewUrl: "https://preview.url",
        },
      ],
    })),
    totalTracks: 4,
  };

  it("switches between Discover and Mood Transition tabs via TopBar and hides Preferences button on Transition tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    // On Discover tab, Preferences button is visible
    expect(
      screen.getByRole("button", { name: /open taste preferences/i }),
    ).toBeInTheDocument();

    const transitionTab = screen.getByRole("tab", { name: /mood transition/i });
    expect(transitionTab).toBeInTheDocument();

    await user.click(transitionTab);

    // On Mood Transition tab, Preferences button is NOT rendered
    expect(
      screen.queryByRole("button", { name: /open taste preferences/i }),
    ).not.toBeInTheDocument();

    // Verify Mood Transition header is visible
    expect(
      screen.getByRole("heading", { name: /shape your emotional journey/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/how are you feeling right now/i)).toBeInTheDocument();
    expect(screen.getByText(/how would you like to feel/i)).toBeInTheDocument();

    // Switch back to Discover
    const discoverTab = screen.getByRole("tab", { name: /discover/i });
    await user.click(discoverTab);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/tell me how you feel/i);
    expect(
      screen.getByRole("button", { name: /open taste preferences/i }),
    ).toBeInTheDocument();
  });

  it("requires both moods and rejects identical mood selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /mood transition/i }));

    const generateBtn = screen.getByRole("button", { name: /generate journey/i });
    expect(generateBtn).toBeDisabled();

    // Select 'Sad' for starting
    const sadPill = screen.getAllByRole("button", { name: "Sad" })[0];
    await user.click(sadPill);

    // Select 'Sad' for destination (same mood)
    const sadDestPill = screen.getAllByRole("button", { name: "Sad" })[1];
    await user.click(sadDestPill);

    // Shows same-mood warning and remains disabled
    expect(
      screen.getByText(/starting and destination moods are the same/i),
    ).toBeInTheDocument();
    expect(generateBtn).toBeDisabled();

    // Change destination to 'Happy'
    const happyDestPill = screen.getAllByRole("button", { name: "Happy" })[1];
    await user.click(happyDestPill);

    expect(generateBtn).not.toBeDisabled();
  });

  it("plans a 4-stage journey, allows intermediate mood editing, and approves to display 4 playlist sections", async () => {
    vi.spyOn(transitionApi, "planTransition").mockResolvedValue(mockPlan);
    vi.spyOn(transitionApi, "generateTransitionMusic").mockResolvedValue(mockJourney);

    const user = userEvent.setup();
    render(<App />);

    // Go to transition tab
    await user.click(screen.getByRole("tab", { name: /mood transition/i }));

    // Select moods: Sad -> Happy
    const sadPill = screen.getAllByRole("button", { name: "Sad" })[0];
    await user.click(sadPill);

    const happyDestPill = screen.getAllByRole("button", { name: "Happy" })[1];
    await user.click(happyDestPill);

    // Click Generate Journey
    await user.click(screen.getByRole("button", { name: /generate journey/i }));

    // Verify Review Card shows 4 stages
    await waitFor(() => {
      expect(screen.getByText(/review your journey/i)).toBeInTheDocument();
      expect(screen.getByText("Stage 01")).toBeInTheDocument();
      expect(screen.getByText("Stage 02")).toBeInTheDocument();
      expect(screen.getByText("Stage 03")).toBeInTheDocument();
      expect(screen.getByText("Stage 04")).toBeInTheDocument();
    });

    // Edit Stage 2 intermediate mood
    const editBtn = screen.getByRole("button", {
      name: /edit intermediate mood for stage 2/i,
    });
    await user.click(editBtn);

    const editInput = screen.getByDisplayValue("Reflective");
    await user.clear(editInput);
    await user.type(editInput, "Peaceful");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Verify intermediate mood changed
    expect(screen.getByText("Peaceful")).toBeInTheDocument();

    // Approve and generate music
    const approveBtn = screen.getByRole("button", { name: /approve & generate music/i });
    await user.click(approveBtn);

    // Layered Playlist displays 4 sections and Spotify redirect play actions
    await waitFor(() => {
      expect(screen.getByText("01 — Starting Mood")).toBeInTheDocument();
      expect(screen.getByText("02 — First Transition")).toBeInTheDocument();
      expect(screen.getByText("03 — Second Transition")).toBeInTheDocument();
      expect(screen.getByText("04 — Destination Mood")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /new journey/i })).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /play sad song 1 on spotify/i })
      ).toHaveAttribute("href", "https://spotify.com");
    });
  });
});
