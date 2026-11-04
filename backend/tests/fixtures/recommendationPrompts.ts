export interface TestPromptFixture {
  id: string;
  category:
    | "mood"
    | "activity"
    | "genre"
    | "vocals"
    | "energy"
    | "tempo"
    | "context"
    | "ambiguous"
    | "conflicting";
  prompt: string;
  expectedExplicit: {
    mood?: string;
    activity?: string;
    genre?: string[];
    vocals?: string;
  };
  expectedKeywordsInQuery: string[];
  forbiddenKeywordsInQuery?: string[];
}

export const RECOMMENDATION_TEST_PROMPTS: TestPromptFixture[] = [
  // 1-8 Mood-based
  {
    id: "m-1",
    category: "mood",
    prompt: "Melancholic songs for a rainy day",
    expectedExplicit: { mood: "melancholic" },
    expectedKeywordsInQuery: ["melancholic"],
  },
  {
    id: "m-2",
    category: "mood",
    prompt: "Give me joyful and uplifting music",
    expectedExplicit: { mood: "joyful" },
    expectedKeywordsInQuery: ["joyful"],
  },
  {
    id: "m-3",
    category: "mood",
    prompt: "I need nostalgic songs that feel like the 90s",
    expectedExplicit: { mood: "nostalgic" },
    expectedKeywordsInQuery: ["nostalgic"],
  },
  {
    id: "m-4",
    category: "mood",
    prompt: "Dark and moody atmospheric tracks",
    expectedExplicit: { mood: "dark" },
    expectedKeywordsInQuery: ["dark"],
  },
  {
    id: "m-5",
    category: "mood",
    prompt: "Dreamy ethereal soundscapes for floating",
    expectedExplicit: { mood: "dreamy" },
    expectedKeywordsInQuery: ["dreamy"],
  },
  {
    id: "m-6",
    category: "mood",
    prompt: "Euphoric festival anthems",
    expectedExplicit: { mood: "euphoric" },
    expectedKeywordsInQuery: ["euphoric"],
  },
  {
    id: "m-7",
    category: "mood",
    prompt: "Angry aggressive heavy music",
    expectedExplicit: { mood: "angry" },
    expectedKeywordsInQuery: ["angry"],
  },
  {
    id: "m-8",
    category: "mood",
    prompt: "Chill laid-back Sunday morning vibes",
    expectedExplicit: { mood: "chill" },
    expectedKeywordsInQuery: ["chill"],
  },

  // 9-16 Activity-based
  {
    id: "a-1",
    category: "activity",
    prompt: "Music for high intensity workout",
    expectedExplicit: { activity: "workout" },
    expectedKeywordsInQuery: ["workout"],
  },
  {
    id: "a-2",
    category: "activity",
    prompt: "Peaceful music for studying",
    expectedExplicit: { mood: "peaceful", activity: "studying" },
    expectedKeywordsInQuery: ["peaceful", "study"],
  },
  {
    id: "a-3",
    category: "activity",
    prompt: "Background music for deep work and coding",
    expectedExplicit: { activity: "coding" },
    expectedKeywordsInQuery: ["focus"],
  },
  {
    id: "a-4",
    category: "activity",
    prompt: "Music for meditation and mindfulness session",
    expectedExplicit: { activity: "meditation" },
    expectedKeywordsInQuery: ["meditation"],
  },
  {
    id: "a-5",
    category: "activity",
    prompt: "Upbeat songs for a long road trip drive",
    expectedExplicit: { activity: "driving" },
    expectedKeywordsInQuery: ["driving"],
  },
  {
    id: "a-6",
    category: "activity",
    prompt: "Music for sleeping and deep relaxation",
    expectedExplicit: { activity: "sleeping" },
    expectedKeywordsInQuery: ["sleep"],
  },
  {
    id: "a-7",
    category: "activity",
    prompt: "Groovy tracks for cooking dinner with friends",
    expectedExplicit: { activity: "cooking" },
    expectedKeywordsInQuery: ["cooking"],
  },
  {
    id: "a-8",
    category: "activity",
    prompt: "High energy tracks for running outdoors",
    expectedExplicit: { activity: "running" },
    expectedKeywordsInQuery: ["running"],
  },

  // 17-23 Genre-specific
  {
    id: "g-1",
    category: "genre",
    prompt: "Electronic synthwave music for night driving",
    expectedExplicit: { genre: ["synthwave", "electronic"] },
    expectedKeywordsInQuery: ["synthwave"],
  },
  {
    id: "g-2",
    category: "genre",
    prompt: "Cozy indie folk songs",
    expectedExplicit: { genre: ["indie folk"] },
    expectedKeywordsInQuery: ["folk"],
  },
  {
    id: "g-3",
    category: "genre",
    prompt: "Smooth jazz for evening cocktails",
    expectedExplicit: { genre: ["jazz"] },
    expectedKeywordsInQuery: ["jazz"],
  },
  {
    id: "g-4",
    category: "genre",
    prompt: "Heavy metal rock for intense gym sessions",
    expectedExplicit: { genre: ["heavy metal", "rock"] },
    expectedKeywordsInQuery: ["metal"],
  },
  {
    id: "g-5",
    category: "genre",
    prompt: "90s boom bap hip hop beats",
    expectedExplicit: { genre: ["hip hop"] },
    expectedKeywordsInQuery: ["hip hop"],
  },
  {
    id: "g-6",
    category: "genre",
    prompt: "Ambient lofi chillhop beats",
    expectedExplicit: { genre: ["lofi"] },
    expectedKeywordsInQuery: ["lofi"],
  },
  {
    id: "g-7",
    category: "genre",
    prompt: "Warm acoustic fingerstyle guitar music",
    expectedExplicit: { genre: ["acoustic"] },
    expectedKeywordsInQuery: ["acoustic"],
  },

  // 24-29 Vocal preferences
  {
    id: "v-1",
    category: "vocals",
    prompt: "Peaceful music for studying, preferably without lyrics",
    expectedExplicit: { vocals: "instrumental_preferred" },
    expectedKeywordsInQuery: ["peaceful", "instrumental", "study"],
  },
  {
    id: "v-2",
    category: "vocals",
    prompt: "Instrumental piano for reading",
    expectedExplicit: { vocals: "instrumental_preferred" },
    expectedKeywordsInQuery: ["instrumental", "reading"],
  },
  {
    id: "v-3",
    category: "vocals",
    prompt: "Songs with powerful female vocal performances",
    expectedExplicit: { vocals: "vocals_preferred" },
    expectedKeywordsInQuery: ["vocal"],
  },
  {
    id: "v-4",
    category: "vocals",
    prompt: "Deep meditation sound without any singing",
    expectedExplicit: { vocals: "instrumental_preferred" },
    expectedKeywordsInQuery: ["instrumental", "meditation"],
  },
  {
    id: "v-5",
    category: "vocals",
    prompt: "Acoustic songs with warm vocals",
    expectedExplicit: { vocals: "vocals_preferred" },
    expectedKeywordsInQuery: ["acoustic"],
  },
  {
    id: "v-6",
    category: "vocals",
    prompt: "Strictly instrumental ambient background music",
    expectedExplicit: { vocals: "instrumental_preferred" },
    expectedKeywordsInQuery: ["instrumental", "ambient"],
  },

  // 30-34 Energy preferences
  {
    id: "e-1",
    category: "energy",
    prompt: "Very low energy music to unwind",
    expectedExplicit: { mood: "unwind" },
    expectedKeywordsInQuery: ["unwind"],
  },
  {
    id: "e-2",
    category: "energy",
    prompt: "High energy pump-up music for sports",
    expectedExplicit: { mood: "pump-up" },
    expectedKeywordsInQuery: ["high energy"],
  },
  {
    id: "e-3",
    category: "energy",
    prompt: "Calm and mellow slow music",
    expectedExplicit: { mood: "calm" },
    expectedKeywordsInQuery: ["calm"],
  },
  {
    id: "e-4",
    category: "energy",
    prompt: "Mid-tempo easy listening",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["listening"],
  },
  {
    id: "e-5",
    category: "energy",
    prompt: "Explosive and furious music",
    expectedExplicit: { mood: "explosive" },
    expectedKeywordsInQuery: ["explosive"],
  },

  // 35-39 Tempo preferences
  {
    id: "t-1",
    category: "tempo",
    prompt: "Slow tempo music for quiet reflection",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["reflection"],
  },
  {
    id: "t-2",
    category: "tempo",
    prompt: "Fast upbeat tempo for cardio workout",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["cardio"],
  },
  {
    id: "t-3",
    category: "tempo",
    prompt: "Gentle slow acoustic music",
    expectedExplicit: { genre: ["acoustic"] },
    expectedKeywordsInQuery: ["acoustic"],
  },
  {
    id: "t-4",
    category: "tempo",
    prompt: "140 bpm fast electronic tracks",
    expectedExplicit: { genre: ["electronic"] },
    expectedKeywordsInQuery: ["electronic"],
  },
  {
    id: "t-5",
    category: "tempo",
    prompt: "Slow waltz instrumental",
    expectedExplicit: { vocals: "instrumental_preferred" },
    expectedKeywordsInQuery: ["waltz", "instrumental"],
  },

  // 40-44 Contextual requests
  {
    id: "c-1",
    category: "context",
    prompt: "Music for studying at 3 AM in the dark",
    expectedExplicit: { activity: "studying" },
    expectedKeywordsInQuery: ["study"],
  },
  {
    id: "c-2",
    category: "context",
    prompt: "Sunny morning coffee on the balcony",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["coffee"],
  },
  {
    id: "c-3",
    category: "context",
    prompt: "Rainy evening jazz by the fireplace",
    expectedExplicit: { genre: ["jazz"] },
    expectedKeywordsInQuery: ["jazz"],
  },
  {
    id: "c-4",
    category: "context",
    prompt: "Late night neon city walk",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["city"],
  },
  {
    id: "c-5",
    category: "context",
    prompt: "Sunday afternoon gardening vibes",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["gardening"],
  },

  // 45-47 Ambiguous requests
  {
    id: "amb-1",
    category: "ambiguous",
    prompt: "Something good to listen to",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["good music"],
    forbiddenKeywordsInQuery: ["chill", "ambient", "feel good"], // should not invent arbitrary mood
  },
  {
    id: "amb-2",
    category: "ambiguous",
    prompt: "Sad music",
    expectedExplicit: { mood: "sad" },
    expectedKeywordsInQuery: ["sad"],
    forbiddenKeywordsInQuery: ["workout", "study"], // should not invent activities
  },
  {
    id: "amb-3",
    category: "ambiguous",
    prompt: "Music for right now",
    expectedExplicit: {},
    expectedKeywordsInQuery: ["music"],
  },

  // 48-50 Conflicting preferences
  {
    id: "con-1",
    category: "conflicting",
    prompt: "Something relaxing but not too slow",
    expectedExplicit: { mood: "relaxing" },
    expectedKeywordsInQuery: ["relaxing"],
    forbiddenKeywordsInQuery: ["slow"], // explicitly excluded slow tempo
  },
  {
    id: "con-2",
    category: "conflicting",
    prompt: "Energetic music without aggressive vocals",
    expectedExplicit: { mood: "energetic" },
    expectedKeywordsInQuery: ["energetic"],
    forbiddenKeywordsInQuery: ["aggressive"],
  },
  {
    id: "con-3",
    category: "conflicting",
    prompt: "Acoustic rock with no drums",
    expectedExplicit: { genre: ["acoustic", "rock"] },
    expectedKeywordsInQuery: ["acoustic"],
  },
];

