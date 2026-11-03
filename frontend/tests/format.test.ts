import { formatDuration, humanize } from "../src/utils/format";

describe("formatDuration", () => {
  it.each([
    [185000, "3:05"],
    [59000, "0:59"],
    [600000, "10:00"],
    [0, "0:00"],
  ])("formats %d ms as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it.each([null, undefined, -1, Number.NaN])("returns null for %s", (value) => {
    expect(formatDuration(value)).toBeNull();
  });
});

describe("humanize", () => {
  it("converts snake_case to a readable label", () => {
    expect(humanize("instrumental_preferred")).toBe("Instrumental preferred");
    expect(humanize("late_night")).toBe("Late night");
  });

  it("returns a dash for empty values", () => {
    expect(humanize(null)).toBe("—");
    expect(humanize("")).toBe("—");
  });
});

