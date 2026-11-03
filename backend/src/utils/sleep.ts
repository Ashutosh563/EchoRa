/** Promise-based sleep; injectable in services so tests don't actually wait. */
export type Sleep = (ms: number) => Promise<void>;

export const sleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

