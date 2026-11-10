import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import * as transitionApi from "../src/api/transitionApi";
import type {
  TransitionIntentResponse,
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

  it("keeps navigation centered and places Preferences inside the account menu", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole("button", { name: /open taste preferences/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open account menu/i }));
    expect(screen.getByRole("button", { name: /taste preferences/i })).toBeInTheDocument();

    const transitionTab = screen.getByRole("tab", { name: /mood transition/i });
    expect(transitionTab).toBeInTheDocument();

    await user.click(transitionTab);

    await user.click(screen.getByRole("button", { name: /open account menu/i }));
    expect(screen.getByRole("button", { name: /taste preferences/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    // Verify Mood Transition header is visible
    expect(await screen.findByRole("heading", { name: /where do you want your mood to go/i })).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: /describe how you feel now/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /choose moods/i }));
    expect(await screen.findByText(/how do you feel right now/i)).toBeInTheDocument();
    expect(screen.getByText(/how do you feel right now/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /describe transition/i }));
    expect(await screen.findByRole("textbox", { name: /describe how you feel now/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /choose moods/i }));
    await user.click(await screen.findByRole("button", { name: "Sad" }));
    await user.click(screen.getAllByRole("button", { name: /continue/i }).at(-1)!);
    expect(screen.getByText(/how would you like to feel/i)).toBeInTheDocument();

    // Switch back to Discover
    const discoverTab = screen.getByRole("tab", { name: /discover/i });
    await user.click(discoverTab);
    expect(await screen.findByRole("heading", { name: /tell me how you feel/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open account menu/i }));
    expect(screen.getByRole("button", { name: /taste preferences/i })).toBeInTheDocument();
  });

  it("requires both moods and rejects identical mood selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /mood transition/i }));
    await user.click(await screen.findByRole("button", { name: /choose moods/i }));

    expect(screen.queryByRole("button", { name: /generate journey/i })).not.toBeInTheDocument();

    // Select the starting mood, then continue to the destination step.
    await user.click(await screen.findByRole("button", { name: "Sad" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const generateBtn = screen.getByRole("button", { name: /generate journey/i });
    expect(generateBtn).toBeDisabled();

    // Select 'Sad' as destination to test identical endpoint validation.
    await user.click(await screen.findByRole("button", { name: "Sad" }));

    // Shows same-mood warning and remains disabled
    expect(screen.getByText(/starting and destination moods are the same/i)).toBeInTheDocument();
    expect(generateBtn).toBeDisabled();

    // Change destination to 'Happy'
    const happyDestPill = screen.getByRole("button", { name: "Happy" });
    await user.click(happyDestPill);

    expect(generateBtn).not.toBeDisabled();
  });

  it("interprets a natural language transition, lets the user edit endpoints, and continues to the journey review", async () => {
    const interpreted: TransitionIntentResponse = {
      status: "ready",
      startingMood: "Overwhelmed",
      destinationMood: "Calm and focused",
      interpretation: "A shift from post-work overwhelm toward calm focus.",
    };
    vi.spyOn(transitionApi, "interpretTransition").mockResolvedValue(interpreted);
    vi.spyOn(transitionApi, "planTransition").mockResolvedValue({
      stages: mockPlan.stages.map((stage, index) => ({
        ...stage,
        stage: index + 1,
        mood: index === 0 ? "Overwhelmed" : index === 3 ? "Calm and focused" : stage.mood,
      })),
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /mood transition/i }));
    await user.click(await screen.findByRole("button", { name: /describe transition/i }));

    await user.type(
      await screen.findByRole("textbox", { name: /describe how you feel now/i }),
      "I feel overwhelmed after work and want to feel calm and focused",
    );
    await user.click(screen.getByRole("button", { name: /interpret mood transition/i }));

    expect(await screen.findByText("A shift from post-work overwhelm toward calm focus.")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("Overwhelmed");
    expect(screen.getByLabelText("To")).toHaveValue("Calm and focused");

    await user.clear(screen.getByLabelText("From"));
    await user.type(screen.getByLabelText("From"), "Tense");
    await user.click(screen.getByRole("button", { name: /build journey/i }));

    await waitFor(() => expect(screen.getByText(/review your journey/i)).toBeInTheDocument());
    expect(transitionApi.planTransition).toHaveBeenCalledWith("Tense", "Calm and focused");
  });

  it("plans a 4-stage journey, allows intermediate mood editing, and approves to display 4 playlist sections", async () => {
    vi.spyOn(transitionApi, "planTransition").mockResolvedValue(mockPlan);
    vi.spyOn(transitionApi, "generateTransitionMusic").mockResolvedValue(mockJourney);

    const user = userEvent.setup();
    render(<App />);

    // Go to transition tab
    await user.click(screen.getByRole("tab", { name: /mood transition/i }));
    await user.click(await screen.findByRole("button", { name: /choose moods/i }));

    // Select moods in the two-step manual flow: Sad -> Happy
    await user.click(await screen.findByRole("button", { name: "Sad" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: "Happy" }));

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
