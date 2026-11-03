import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { MusicApiError } from "../src/api/musicApi";
import { createMockClient } from "../src/api/mockClient";
import { EXAMPLE_PROMPTS } from "../src/components/ExamplePrompts";
import { createDeferredApi, SAMPLE_RESPONSE } from "./mocks/fakeApi";

const PLACEHOLDER = "Something calm for a 3 AM study session...";

describe("App - main page", () => {
  it("renders heading, description, input with placeholder and Search button", () => {
    render(<App api={createDeferredApi().api} />);
    expect(screen.getByRole("heading", { name: "SONORA" })).toBeInTheDocument();
    expect(screen.getByText("AI-powered mood-based music discovery.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("renders all example prompts", () => {
    render(<App api={createDeferredApi().api} />);
    for (const prompt of EXAMPLE_PROMPTS) {
      expect(screen.getByRole("button", { name: prompt })).toBeInTheDocument();
    }
  });

  it("clicking an example populates the input without searching", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.click(screen.getByRole("button", { name: "Happy acoustic music." }));

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("Happy acoustic music.");
    expect(fake.calls).toHaveLength(0);
  });
});

describe("App - search interactions", () => {
  it("Search button submits, shows loading, then intent and results", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "calm study music");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(fake.calls).toEqual(["calm study music"]);
    expect(screen.getByRole("status")).toHaveTextContent(/finding music/i);
    expect(screen.getByRole("button", { name: /searching/i })).toBeDisabled();

    await act(async () => fake.resolve());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    // Interpreted intent: all seven fields
    const intent = screen.getByRole("region", { name: "Interpreted intent" });
    for (const [label, value] of [
      ["Mood", "Calm"],
      ["Activity", "Studying"],
      ["Energy", "Low"],
      ["Genre", "Ambient, Lofi"],
      ["Tempo preference", "Slow"],
      ["Vocal preference", "Instrumental preferred"],
      ["Time context", "Late night"],
    ]) {
      const field = within(intent).getByText(label).closest("div")!;
      expect(field).toHaveTextContent(value);
    }

    // Results
    const results = screen.getByRole("region", { name: "Results" });
    const items = within(results).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = items[0]!;
    expect(within(first).getByRole("heading", { name: "Test Song" })).toBeInTheDocument();
    expect(within(first).getByText("Test Artist, Guest")).toBeInTheDocument();
    expect(within(first).getByText("Test Album")).toBeInTheDocument();
    expect(within(first).getByText("3:05")).toBeInTheDocument();
    expect(within(first).getByRole("img")).toHaveAttribute("src", "https://example.com/art.jpg");
    expect(within(first).getByRole("link", { name: "Open in Spotify" })).toHaveAttribute(
      "href",
      "https://open.spotify.com/track/t1",
    );

    // Missing metadata falls back gracefully
    const second = items[1]!;
    expect(within(second).getByText("Unknown artist")).toBeInTheDocument();
    expect(within(second).getByLabelText("No artwork available")).toBeInTheDocument();
    expect(within(second).queryByText(/^\d+:\d{2}$/)).not.toBeInTheDocument();

    expect(screen.getByText("Showing mock data.")).toBeInTheDocument();
  });

  it("Enter key submits the search", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "workout music{Enter}");

    expect(fake.calls).toEqual(["workout music"]);
  });

  it("shows a validation message for an empty prompt and does not search", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "   ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/describe what you'd like/i);
    expect(fake.calls).toHaveLength(0);
  });

  it("shows a user-friendly error message when the search fails", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "anything{Enter}");
    await act(async () => fake.reject(new MusicApiError("SPOTIFY_RATE_LIMITED", "Spotify is busy. Try again.")));

    expect(screen.getByRole("alert")).toHaveTextContent("Spotify is busy. Try again.");
  });

  it("hides technical details for unexpected errors", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "anything{Enter}");
    await act(async () => fake.reject(new TypeError("Failed to fetch: ECONNREFUSED")));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/ECONNREFUSED/);
  });

  it("shows an empty-results message when no tracks are returned", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "obscure{Enter}");
    await act(async () => fake.resolve({ ...SAMPLE_RESPONSE, tracks: [] }));

    expect(screen.getByText(/no songs matched/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows Spotify attribution in live mode", async () => {
    const user = userEvent.setup();
    const fake = createDeferredApi();
    render(<App api={fake.api} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "calm{Enter}");
    await act(async () => fake.resolve({ ...SAMPLE_RESPONSE, mode: "live", notice: undefined }));

    expect(screen.getByText(/provided by Spotify/i)).toBeInTheDocument();
  });
});

describe("App - default mock client (end-to-end in the browser)", () => {
  it("works with the built-in mock client and shows 6-8 results", async () => {
    const user = userEvent.setup();
    const mockClient = createMockClient(50);
    render(<App api={mockClient} />);

    await user.click(screen.getByRole("button", { name: "Energetic music for a workout." }));
    await user.click(screen.getByRole("button", { name: "Search" }));

    const results = await screen.findByRole("region", { name: "Results" }, { timeout: 3000 });
    const count = within(results).getAllByRole("listitem").length;
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(8);
    expect(screen.getByRole("region", { name: "Interpreted intent" })).toHaveTextContent("Energetic");
  });
});
