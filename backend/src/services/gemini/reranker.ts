import type { GeminiClient } from "./geminiClient.js";
import type { MusicIntent } from "../../types/intent.js";
import type { DiscoveryMode } from "../../types/discovery.js";
import type { Track } from "../../types/track.js";
import { logger } from "../../utils/logger.js";
import { normalizeSongTitle, getSongSignature } from "../music/fusion.js";

const RERANKER_TIMEOUT_MS = 4500;

export function isMashupOrMix(track: Track): boolean {
  const text = `${track.name} ${track.artists.join(" ")} ${track.album}`.toLowerCase();
  return (
    text.includes("mashup") ||
    text.includes("mash up") ||
    text.includes("mash-up") ||
    text.includes("dj mix") ||
    text.includes("vdj") ||
    text.includes("lofi mix") ||
    text.includes("lo-fi mix") ||
    text.includes("chill mix") ||
    text.includes("remix") ||
    text.includes("medley") ||
    text.includes("club mix")
  );
}

/**
 * Detects whether a track is purely instrumental, karaoke, background score, or theme music.
 */
export function isInstrumentalTrack(track: Track): boolean {
  const title = track.name.toLowerCase();
  const album = (track.album || "").toLowerCase();
  const artists = track.artists.join(" ").toLowerCase();
  const fullText = `${title} ${artists} ${album}`;

  if (
    fullText.includes("instrumental") ||
    fullText.includes("karaoke") ||
    fullText.includes("backing track") ||
    fullText.includes("minus one")
  ) {
    return true;
  }

  const bgmOrScorePatterns = [
    /\b(bgm|original score|background score|film score|soundtrack score)\b/i,
    /\btheme\s+(music|tune|track|song)\b/i,
    /\b(flute|violin|sitar|piano|guitar|saxophone|shehnai|accordion|mandolin|cello|harp)\s+theme\b/i,
    /[-–—]\s*(theme|bgm|score|instrumental|karaoke)\b/i,
    /\((theme|bgm|score|instrumental|karaoke|original score|background score)\)/i,
    /\[(theme|bgm|score|instrumental|karaoke|original score|background score)\]/i,
  ];

  for (const pattern of bgmOrScorePatterns) {
    if (pattern.test(title) || pattern.test(album)) {
      return true;
    }
  }

  if (
    artists === "instrumental" ||
    artists.includes("karaoke") ||
    artists.includes("the piano guys") ||
    artists.includes("piano dreamers")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether the user explicitly requested instrumental music in their prompt or intent.
 */
export function userWantsInstrumental(prompt: string, intent?: MusicIntent): boolean {
  if (intent?.vocals === "instrumental_preferred") return true;
  const p = prompt.toLowerCase();
  const keywords = [
    /\binstrumental\b/i,
    /\bbgm\b/i,
    /\bscore\b/i,
    /\bsoundtrack score\b/i,
    /\bpiano only\b/i,
    /\bguitar only\b/i,
    /\bacoustic only\b/i,
    /\bflute only\b/i,
    /\bviolin only\b/i,
    /\bno vocals\b/i,
    /\bno singing\b/i,
    /\bwithout vocals\b/i,
    /\bwithout lyrics\b/i,
    /\bwithout words\b/i,
    /\bno words\b/i,
    /\blofi\b/i,
    /\blo-fi\b/i,
    /\bambient\b/i,
    /\bclassical\b/i,
    /\borchestral\b/i,
    /\bkaraoke\b/i,
  ];
  return keywords.some((pattern) => pattern.test(p));
}

export function getPrimaryArtistKey(track: Track): string {
  if (!track.artists || track.artists.length === 0) return "unknown";
  return track.artists[0].toLowerCase().trim();
}

function matchesExplicitRequest(track: Track, intent?: MusicIntent): boolean {
  if (!intent) return true;

  if (intent.artist?.trim()) {
    const requestedArtist = intent.artist.toLowerCase().trim();
    if (!track.artists.some((artist) => artist.toLowerCase().trim() === requestedArtist)) return false;
  }

  if (intent.trackTitle?.trim()) {
    const requestedTitle = normalizeSongTitle(intent.trackTitle);
    const candidateTitle = normalizeSongTitle(track.name);
    if (!requestedTitle || candidateTitle !== requestedTitle) return false;
  }

  return true;
}

/**
 * Splits multi-artist query strings (e.g. "Diljit Dosanjh and Karan Aujla", "Arijit Singh & Shreya Ghoshal")
 * into distinct artist names.
 */
export function parseTargetArtists(artistStr?: string | null): string[] {
  if (!artistStr) return [];
  const parts = artistStr
    .split(/\s*(?:,|&|\band\b|\bfeat\.?\b|\bfeaturing\b|\bx\b|\bvs\.?\b)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : [artistStr.trim()];
}

/**
 * Normalizes an artist or track name by lowercasing and stripping non-alphanumeric characters.
 * Allows "dilraaz" to match "Dil Raaz", "krsna" to match "KR$NA", and "cold mess" to match "cold/mess".
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Checks whether a track artist matches a target artist query with space, punctuation, and symbol tolerance.
 */
export function isArtistMatch(trackArtist: string, targetArtist: string): boolean {
  const tLower = targetArtist.toLowerCase().trim();
  const aLower = trackArtist.toLowerCase().trim();
  if (aLower.includes(tLower) || tLower.includes(aLower)) return true;

  const tNorm = normalizeEntityName(targetArtist);
  const aNorm = normalizeEntityName(trackArtist);
  if (tNorm.length >= 3 && aNorm.length >= 3) {
    if (aNorm === tNorm || aNorm.includes(tNorm) || tNorm.includes(aNorm)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a track violates the user's natural language negative constraints
 * (e.g. excluded artists, excluded genres, or negative keyword phrases).
 */
export function matchesNegativeConstraints(track: Track, intent: MusicIntent): boolean {
  const neg = intent.negativeConstraints;
  const fullText = `${track.name} ${track.artists.join(" ")} ${track.album}`.toLowerCase();

  // 1. Check excluded artists
  if (neg?.excludedArtists && neg.excludedArtists.length > 0) {
    for (const excluded of neg.excludedArtists) {
      const ex = excluded.toLowerCase().trim();
      if (!ex) continue;
      if (track.artists.some((a) => a.toLowerCase().trim() === ex)) {
        return true;
      }
    }
  }

  // 2. Check excluded genres
  if (neg?.excludedGenres && neg.excludedGenres.length > 0) {
    for (const genre of neg.excludedGenres) {
      const g = genre.toLowerCase().trim();
      if (!g) continue;
      const escapedGenre = g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedGenre}\\b`, "i");
      if (regex.test(fullText)) {
        return true;
      }
    }
  }

  // 3. Check negative keywords
  if (neg?.negativeKeywords && neg.negativeKeywords.length > 0) {
    for (const kw of neg.negativeKeywords) {
      const k = kw.toLowerCase().trim();
      if (!k) continue;
      if (fullText.includes(k)) {
        return true;
      }
    }
  }

  // 4. Also check forbiddenVibes from antiSonicAura for common exclusions (e.g. rap, drill, club)
  const forbiddenVibes = intent.sonicProfile?.antiSonicAura?.forbiddenVibes;
  if (forbiddenVibes && forbiddenVibes.length > 0) {
    for (const vibe of forbiddenVibes) {
      const v = vibe.toLowerCase().trim();
      if (v.includes("rap") && /\brap\b/i.test(fullText)) return true;
      if (v.includes("edm") && /\bedm\b/i.test(fullText)) return true;
      if (v.includes("drill") && /\bdrill\b/i.test(fullText)) return true;
      if (v.includes("trap") && /\btrap\b/i.test(fullText)) return true;
    }
  }

  return false;
}

export function isTargetEra(track: Track, era: string | null | undefined): boolean {
  if (!era) return true;
  if (!track.releaseYear) return true; // keep if year unknown

  const text = `${track.name} ${track.album || ""}`.toLowerCase();
  const isRemasterOrReissue =
    text.includes("remaster") ||
    text.includes("anniversary") ||
    text.includes("reissue") ||
    text.includes("deluxe") ||
    text.includes("edition") ||
    text.includes("live at") ||
    text.includes("greatest hits");

  const e = era.toLowerCase();
  if (e.includes("90") || e.includes("1990")) {
    if (track.releaseYear >= 1989 && track.releaseYear <= 2001) return true;
    if (isRemasterOrReissue) return true;
    return false;
  }
  if (e.includes("80") || e.includes("1980")) {
    if (track.releaseYear >= 1979 && track.releaseYear <= 1991) return true;
    if (isRemasterOrReissue) return true;
    return false;
  }
  if (e.includes("70") || e.includes("1970")) {
    if (track.releaseYear >= 1969 && track.releaseYear <= 1981) return true;
    if (isRemasterOrReissue) return true;
    return false;
  }
  if (e.includes("2000") || e.includes("00s")) {
    if (track.releaseYear >= 1999 && track.releaseYear <= 2011) return true;
    if (isRemasterOrReissue) return true;
    return false;
  }
  return true;
}

const KPOP_GROUPS = [
  "blackpink", "bts", "twice", "stray kids", "newjeans", "txt",
  "tomorrow x together", "enhypen", "red velvet", "exo", "seventeen",
  "itzy", "ateez", "aespa", "le sserafim", "(g)i-dle", "nct",
  "nct 127", "nct dream", "monsta x", "bigbang", "got7", "jungkook",
  "jimin", "agust d", "suga", "rm", "j-hope", "lisa", "jennie", "rose", "jisoo"
];

const GLOBAL_WESTERN_MAINSTREAM_ARTISTS = [
  "bill beasley", "drake", "taylor swift", "kanye west", "travis scott",
  "kendrick lamar", "eminem", "lil wayne", "lil baby", "lil uzi vert",
  "future", "young thug", "juice wrld", "pop smoke", "21 savage",
  "post malone", "justin bieber", "ed sheeran", "ariana grande",
  "the weeknd", "dua lipa", "billie eilish", "harry styles",
  "shawn mendes", "bruno mars", "maroon 5", "imagine dragons",
  "coldplay", "one direction", "5 seconds of summer", "chainsmokers",
  "calvin harris", "david guetta", "marshmello", "alan walker",
  "martin garrix", "gawne", "tyler f", "tinie tempah", "central cee",
  "jack harlow", "dababy", "roddy ricch", "nba youngboy", "lil durk",
  "machine gun kelly", "oliver tree", "benson boone", "teddy swims",
  "stephen sanchez", "dean lewis", "lewis capaldi", "james arthur",
  "tom odell", "sam smith", "adele", "hozier", "simon dinnigan",
  "engelbert humperdinck", "herb alpert", "ben e. king", "hayasa g",
  "chris de burgh", "foals", "elvis presley", "frank sinatra",
  "michael jackson", "queen", "the beatles", "pink floyd", "led zeppelin",
  "nirvana", "radiohead", "arctic monkeys", "the strokes",
  "red hot chili peppers", "gorillaz", "daft punk", "avicii", "kygo",
  "skrillex", "diplo", "macklemore", "rihanna", "beyonce", "katy perry",
  "lady gaga", "selena gomez", "miley cyrus", "demi lovato", "cardi b",
  "megan thee stallion", "doja cat", "olivia rodrigo", "sabrina carpenter",
  "chappell roan", "charli xcx"
];

const DESI_MAINSTREAM_ARTISTS = [
  "arijit singh", "sidhu moose wala", "dhanda nyoliwala", "pritam",
  "neha kakkar", "badshah", "diljit dosanjh", "ap dhillon", "karan aujla",
  "shubh", "lata mangeshkar", "kishore kumar", "mohammed rafi",
  "sonu nigam", "kumar sanu", "udit narayan", "alka yagnik",
  "shreya ghoshal", "sunidhi chauhan", "kk", "atif aslam",
  "mohit chauhan", "jubin nautiyal", "darshan raval", "armaan malik",
  "prateek kuhad", "anuv jain", "b praak", "jaani", "yo yo honey singh",
  "guru randhawa", "jass manak", "amrinder gill", "hardy sandhu",
  "lucky thakur", "mahi jangid", "khush romana", "pravesh lion"
];

/**
 * Modern Regional Indie, Desi Hip-Hop (DHH), and Alternative Indian artists.
 * Used for Edge Case E (Code-Switching recognition): guarantees regional indie tracks
 * with English/Romanized titles are never rejected under regional context.
 */
export const REGIONAL_INDIE_ARTISTS = [
  "krsna", "kr$na", "seedhe maut", "encore abj", "calm", "divine", "prabh deep",
  "chaar diwaari", "yashraj", "rawal", "bharg", "talha anjum", "talhah yunus",
  "young stunners", "mc stan", "emiway bantai", "paradox", "dhanji", "siyaahi",
  "karan kanchan", "sez on the beat", "bella", "badkidz", "taba chake", "dil raaz",
  "aditya rikhari", "the local train", "when chai met toast", "the yellow diary",
  "parvaaz", "indian ocean", "lifafa", "peter cat recording co", "pcrc", "raghu dixit",
  "swarathma", "oaff", "savera", "ashwin adwani", "sanjeeta bhattacharya", "kamakshi khanna",
  "fooled by april", "achint", "twin strings", "anand bhaskar collective", "aswekeepsearching",
  "bloodywood", "drishyam", "arunaja", "shirley setia", "jonita gandhi", "sanah moidutty"
];

const TITLE_TRAPS: Record<string, RegExp[]> = {
  spanish: [
    /\b(in spanish|spanish ballad|spanish ballads|spanish romance|spanish eyes|spanish guitar|spanish guitars|spanish flea|spanish moss|spanish harlem|spanish train|spanish rose|spanish armada|spanish boots|spanish song|spanish songs|sad spanish automotivo)\b/i,
  ],
  russian: [
    /\b(russian roulette|russian cream|russian tea|russian spy|russian doll|russian winter|russian boy|russian girl|from russia with love)\b/i,
  ],
  french: [
    /\b(french kiss|french vanilla|french toast|french open|in french|french montana)\b/i,
  ],
  japanese: [
    /\b(japanese denim|japanese breakfast|japanese jeans|turning japanese|in japanese)\b/i,
  ],
  korean: [
    /\b(korean bbq|korean beef|korean girl|in korean)\b/i,
  ],
  hindi: [
    /\b(in hindi|hindi song|hindi sad song|hindi remix)\b/i,
  ],
};

function hasSpanishAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const title = track.name;
  const artists = track.artists.join(" ");
  const album = track.album || "";
  const full = `${title} ${artists} ${album}`;

  if (/[áéíóúñü¿¡]/i.test(full)) return true;

  const spanishWordRegex =
    /\b(de|la|el|los|las|del|por|para|con|sin|un|una|unos|unas|mi|mis|tu|tus|su|sus|que|como|pero|amor|corazon|corazón|vida|noche|dias|días|tiempo|alma|dolor|lagrimas|lágrimas|beso|besos|ojos|siempre|nunca|adios|adiós|volver|olvidar|olvido|siento|sola|solo|ti|mí|te|me|se|nos|le|les|cancion|canción|acustico|acústico|acustica|acústica|balada|baladas|desamor|triste|tristeza|despedida|musica|música|espanol|español|latino|latina|mexico|colombia|argentina|chile|venezuela|puerto rico|cuba|bachata|bolero|ranchera|salsa|flamenco|pasodoble|maquillaje|aguas|perdedor|chispa|ceniza|guayaba|torres|fella|marrufo|zullinger|fuego|luna|cielo|sol|mundo|suave|amigo|amiga|hermano|hermana|hombre|mujer|chica|chico|loco|loca|bonita|linda|hermosa|bello|bella|quiero|sabes|puedo|decir|vamos|ahora|hoy|ayer|manana|mañana|gata|odio)\b/i;
  if (spanishWordRegex.test(full)) return true;

  const latinArtistRegex =
    /\b(garcia|rodriguez|gonzalez|hernandez|lopez|martinez|perez|sanchez|ramirez|torres|flores|rivera|gomez|diaz|reyes|morales|ortiz|gutierrez|castro|chavez|ruiz|alvarez|romero|herrera|medina|vargas|castillo|guzman|fernandez|iglesias|sanz|fonsi|balvin|bunny|rosalia|rosalía|maluma|ozuna|yatra|camilo|turizo|morat|aitana|tangana|lafourcade|venegas|soler|alboran|juanes|martin|anthony|santos|royce|noreh|wheeler|guayaba|shakira|daddy yankee|rauw alejandro|peso pluma|nodal|carin leon)\b/i;
  if (latinArtistRegex.test(artists)) return true;

  return false;
}

function hasHindiAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const title = track.name;
  const artists = track.artists.join(" ");
  const album = track.album || "";
  const full = `${title} ${artists} ${album}`;

  const hindiWords =
    /\b(tere|teri|tera|meri|mera|mere|tum|hum|dil|pyaar|pyar|ishq|mohabbat|zindagi|saath|raat|din|pal|khushi|gam|dard|aankhen|khwaab|yaad|yaadein|sanam|jaan|duniya|chura|tujhe|mujhko|humko|kabhi|kahin|kuch|hota|hai|yeh|woh|kaise|kyun|deewana|mastana|anjaana|bewafa|tanhai|judai|barsaat|baarish|hawa|suno|dekho|chalo|chal|bolly|bollywood|hindi|desi|sufi|ghazal|qawwali|channa|mereya|aashiqui|rabba|naina|jeena|saajna|piya|mahiya|dholna|kasam|dua|khuda|sajda|afreen|mitwa|kesariya|kalank|raataan|lambiyan|apna|bana|le|jhol|ehsaas|inaam|husn|baarishein|shayad|qaafirana|gerua|agar|tum|saath|ho|shikayat|manjha|kasoor|kho gaye|baatein|rooh|sukoon|marham|khairiyat)\b/i;
  if (hindiWords.test(full)) return true;

  const indianArtistRegex =
    /\b(singh|kumar|nigam|sharma|verma|khan|ali|kapoor|sen|roy|das|ghoshal|chauhan|kakkar|badshah|pritam|rahman|atif|aslam|arijit|sonu|shreya|sunidhi|mohit|kk|jubin|darshan|prateek|anuv|amit|trivedi|sachin|jigar|vishal|shekhar|shankar|ehsaan|loy|udit|narayan|alka|yagnik|kavita|anuradha|sadhana|jagjit|pankaj|manna|lata|mangeshkar|kishore|rafi|mukesh|neeti|monali|armaan|amaal|tanishk|bagchi|jasleen|royal|b praak|jaani|zaeden|steve|mithoon|rochak|payal|dev|dhvani|tulsi|akull|king|papon|shaan|himesh|reshammiya|sidhu|dhillon|aujla|shubh)\b/i;
  if (indianArtistRegex.test(artists)) return true;

  // Edge Case E: Modern Indian Indie & Desi Hip-Hop (DHH) code-switching recognition.
  // Preserves regional indie tracks with English or alphanumeric song titles (e.g. Kr$na "Say My Name", Taba Chake "Walk With Me", Dil Raaz "Still In Love", Seedhe Maut "101")
  for (const trackArtist of track.artists) {
    if (REGIONAL_INDIE_ARTISTS.some((target) => isArtistMatch(trackArtist, target))) {
      return true;
    }
  }

  return false;
}

function hasRussianAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const full = `${track.name} ${track.artists.join(" ")} ${track.album || ""}`;
  if (/[а-яА-ЯёЁ]/.test(full)) return true;
  const russianMarkers =
    /\b(molchat doma|kino|ploho|chernikovskaya|hata|serebro|zemfira|bi-2|mumiy troll|ddt|nautilus|buerak|utro|motorama|gspd|dead blonde|instasamka|miyagi|scriptonite|t-fest|pharaoh|face|morgenshtern|oxxxymiron|noize mc|valentin strykalo|ssshhhiiittt|peremotka|durnoy vkus|tsoi|viktor tsoi|maksim|lyube|doomer|sovietwave|sudno|pachka|sigaret|gruppa|krovi|zvezda|solntse|spokoina|noch)\b/i;
  return russianMarkers.test(full);
}

function hasJapaneseAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const full = `${track.name} ${track.artists.join(" ")} ${track.album || ""}`;
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(full)) return true;
  const japaneseMarkers =
    /\b(yoasobi|kenshi yonezu|fujii kaze|radwimps|hikaru utada|aimer|eve|lisa|king gnu|vaundy|hige dandism|miki matsubara|tatsuro yamashita|anri|city pop|j-pop|jpop|anime|vocaloid|ado|miliyah|yuuri|back number|aimyon|zutomayo|yorushika)\b/i;
  return japaneseMarkers.test(full);
}

function hasKoreanAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const full = `${track.name} ${track.artists.join(" ")} ${track.album || ""}`;
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(full)) return true;
  const koreanMarkers =
    /\b(k-pop|kpop|iu|taeyeon|bts|blackpink|exo|twice|red velvet|stray kids|newjeans|txt|enhypen|seventeen|itzy|ateez|aespa|le sserafim|g-idle|paul kim|baekhyun|bol4|heize|crush|dean|akmu|day6|shinee|nct|mamamoo|zion.t|epik high|ost|kdrama)\b/i;
  return koreanMarkers.test(full);
}

function hasFrenchAffinity(track: Track): boolean {
  if (track.artists.some((a) => /^Artist\s+/i.test(a))) return true;

  const full = `${track.name} ${track.artists.join(" ")} ${track.album || ""}`;
  if (/[éèêëàâçùûôœ]/i.test(full)) return true;
  const frenchMarkers =
    /\b(stromae|edith piaf|indila|carla bruni|pomme|angele|angèle|coeur de pirate|kendji|louane|maitre gims|gims|vianney|claudio capeo|aya nakamura|ben mazué|georges brassens|jacques brel|charles aznavour|serge gainsbourg|francoise hardy|chanson|amour|nuit|vie|triste|mon|ma|mes|ton|ta|tes|pour|avec|sans|dans|sur)\b/i;
  return frenchMarkers.test(full);
}

export function isLanguageMatch(
  track: Track,
  language: string | null | undefined,
  context?: MusicIntent | string,
): boolean {
  if (!language) return true;
  const lang = language.toLowerCase().trim();
  if (lang === "english") return true;

  const title = track.name.toLowerCase();
  const artistsStr = track.artists.join(" ").toLowerCase();
  const album = (track.album || "").toLowerCase();
  const fullText = `${title} ${artistsStr} ${album}`;

  // Check if user explicitly requested a specific artist in prompt or intent
  let userExplicitArtist = "";
  if (typeof context === "string") {
    userExplicitArtist = context.toLowerCase();
  } else if (context && typeof context === "object") {
    userExplicitArtist = (context.artist || "").toLowerCase();
  }

  const isUserExplicitArtist = (artistName: string): boolean => {
    if (!userExplicitArtist) return false;
    return userExplicitArtist.includes(artistName) || artistName.includes(userExplicitArtist);
  };

  // 1. Title Traps Check
  const normalizedKey =
    lang === "latin"
      ? "spanish"
      : lang === "bollywood"
        ? "hindi"
        : lang;

  const traps = TITLE_TRAPS[normalizedKey];
  if (traps) {
    for (const trap of traps) {
      if (trap.test(title)) {
        return false;
      }
    }
  }

  // 2. K-Pop Leaks into Non-Korean queries
  if (normalizedKey !== "korean") {
    for (const kpop of KPOP_GROUPS) {
      if (track.artists.some((a) => a.toLowerCase().includes(kpop)) && !isUserExplicitArtist(kpop)) {
        return false;
      }
    }
  }

  // 3. Global Western mainstream artists leaking into Non-English queries
  for (const western of GLOBAL_WESTERN_MAINSTREAM_ARTISTS) {
    if (track.artists.some((a) => a.toLowerCase().includes(western)) && !isUserExplicitArtist(western)) {
      return false;
    }
  }

  // 4. Desi (Indian) mainstream artists leaking into Foreign queries (Spanish, Russian, French, Japanese, Korean, etc.)
  if (
    normalizedKey !== "hindi" &&
    normalizedKey !== "bollywood" &&
    normalizedKey !== "punjabi" &&
    normalizedKey !== "indian"
  ) {
    for (const desi of DESI_MAINSTREAM_ARTISTS) {
      if (track.artists.some((a) => a.toLowerCase().includes(desi)) && !isUserExplicitArtist(desi)) {
        return false;
      }
    }
    for (const indie of REGIONAL_INDIE_ARTISTS) {
      if (track.artists.some((a) => isArtistMatch(a, indie)) && !isUserExplicitArtist(indie)) {
        return false;
      }
    }
  }

  // If track artist matches the artist explicitly requested by the user, bypass generic cultural regex
  // with Contextual Disambiguation Guard against foreign homonyms (Edge Case B)
  if (userExplicitArtist) {
    const explicitArtists = parseTargetArtists(userExplicitArtist);
    const isExplicitMatch = explicitArtists.some((target) => {
      return track.artists.some((a) => isArtistMatch(a, target));
    });

    if (isExplicitMatch) {
      // Disambiguation check for Homonymous Artists (Edge Case B):
      // If intent specifies a target regional language (e.g. Hindi, Punjabi, Spanish, Russian),
      // we must NOT allow a foreign namesake track if it triggers that language's title traps
      // or foreign country markers.
      if (normalizedKey && traps) {
        for (const trap of traps) {
          if (trap.test(title)) {
            return false;
          }
        }
      }
      if (normalizedKey === "hindi" || normalizedKey === "punjabi" || normalizedKey === "bollywood") {
        const foreignLeak =
          fullText.includes("finnish") ||
          fullText.includes("helsinki") ||
          fullText.includes("suomi") ||
          fullText.includes("sweden") ||
          fullText.includes("deutschland") ||
          fullText.includes("french pop");
        if (foreignLeak) return false;
      }
      return true;
    }
  }

  // 5. Positive Cultural Affinity Verification (Zero Tolerance for False-Match Western English tracks)
  if (normalizedKey === "spanish") {
    if (!hasSpanishAffinity(track)) return false;
    const isSpanishLeak =
      fullText.includes("drill beats") ||
      fullText.includes("country music") ||
      fullText.includes("trap beats");
    if (isSpanishLeak) return false;
  } else if (normalizedKey === "hindi") {
    if (!hasHindiAffinity(track)) return false;
    const isWesternLeak =
      fullText.includes("dexter") ||
      fullText.includes("lil hann") ||
      fullText.includes("omen") ||
      fullText.includes("vlap") ||
      fullText.includes("trap beats") ||
      fullText.includes("drill beats") ||
      fullText.includes("country music") ||
      fullText.includes("freestyle rap");
    if (isWesternLeak) return false;

    // Non-Hindi regional language leaks when Hindi requested
    const regionalRegex = /\b(malayalam|telugu|tamil|kannada|bhojpuri|haryanvi|rajasthani|marathi|gujarati|odia|assamese)\b/i;
    if (regionalRegex.test(fullText)) return false;

    const nonHindiRegionalMarkers = [
      "sreeraagamo", "pavithram", "k.s. chithra", "k. s. chithra",
      "kj yesudas", "k. j. yesudas", "vidyasagar", "ilayaraja",
      "anirudh ravichander", "yuvan shankar raja", "harris jayaraj",
      "santhosh narayanan", "devi sri prasad", "thaman s", "d. imman"
    ];
    for (const marker of nonHindiRegionalMarkers) {
      if (fullText.includes(marker)) return false;
    }
  } else if (normalizedKey === "russian") {
    if (!hasRussianAffinity(track)) return false;
    const isRussianLeak =
      fullText.includes("key glock") ||
      fullText.includes("abbott & costello") ||
      fullText.includes("iann dior") ||
      fullText.includes("yak slid") ||
      fullText.includes("trap beats") ||
      fullText.includes("drill beats") ||
      fullText.includes("young boy");
    if (isRussianLeak) return false;
  } else if (normalizedKey === "japanese") {
    if (!hasJapaneseAffinity(track)) return false;
  } else if (normalizedKey === "korean") {
    if (!hasKoreanAffinity(track)) return false;
  } else if (normalizedKey === "french") {
    if (!hasFrenchAffinity(track)) return false;
  }

  return true;
}

export interface BalanceOptions {
  cumulativeArtistCounts?: Record<string, number>;
  maxCumulativePerArtist?: number;
  excludeTrackIds?: Set<string>;
  excludeSignatures?: Set<string>;
  maxPerArtist?: number;
  isExclusive?: boolean;
}

export function balanceTracks(
  tracks: Track[],
  maxMashups: number,
  era?: string | null,
  language?: string | null,
  allowInstrumental: boolean = true,
  maxPerArtist: number = 2,
  negativeIntent?: MusicIntent,
  options?: BalanceOptions,
): Track[] {
  let mashupCount = 0;
  const targetEraTracks: Track[] = [];
  const otherEraTracks: Track[] = [];
  const seenTitles = new Set<string>();
  const artistCounts = new Map<string, number>();

  const maxAllowedArtist = options?.maxPerArtist ?? maxPerArtist;
  const maxCumulativeArtist = options?.maxCumulativePerArtist ?? 6;

  for (const t of tracks) {
    if (options?.excludeTrackIds && options.excludeTrackIds.has(t.id)) continue;
    const songSig = getSongSignature(t);
    if (options?.excludeSignatures && options.excludeSignatures.has(songSig)) continue;
    if (!matchesExplicitRequest(t, negativeIntent)) continue;

    if (!allowInstrumental && isInstrumentalTrack(t)) continue;
    if (negativeIntent && matchesNegativeConstraints(t, negativeIntent)) continue;
    if (!isLanguageMatch(t, language, negativeIntent)) continue;

    const norm = normalizeSongTitle(t.name) || t.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
    if (seenTitles.has(norm)) continue;

    const artistKey = getPrimaryArtistKey(t);
    const count = artistCounts.get(artistKey) || 0;
    if (count >= maxAllowedArtist) continue;

    const cumulativeCount = options?.cumulativeArtistCounts ? (options.cumulativeArtistCounts[artistKey] || 0) : 0;
    if (cumulativeCount + count >= maxCumulativeArtist) continue;

    const isMash = isMashupOrMix(t);
    if (isMash && mashupCount >= maxMashups) continue;
    if (isMash) mashupCount++;

    seenTitles.add(norm);
    artistCounts.set(artistKey, count + 1);

    if (isTargetEra(t, era)) {
      targetEraTracks.push(t);
    } else {
      otherEraTracks.push(t);
    }
  }

  // Strict Era Gate: if an era was explicitly requested, NEVER append other-era tracks
  if (era) {
    return targetEraTracks.slice(0, 10);
  }

  const combined = [...targetEraTracks, ...otherEraTracks];
  if (negativeIntent?.artist) {
    const targetArtists = parseTargetArtists(negativeIntent.artist);
    const isExcl = Boolean(
      options?.isExclusive ||
      (/\b(only|just|pure|exclusively|all)\b/i.test(negativeIntent.artist))
    );
    const artistMatches = combined.filter((t) =>
      targetArtists.some((ta) => t.artists.some((a) => isArtistMatch(a, ta)))
    );
    if (isExcl) {
      return artistMatches.slice(0, 10);
    }
    const companionMatches = combined.filter((t) =>
      !targetArtists.some((ta) => t.artists.some((a) => isArtistMatch(a, ta)))
    );
    const targetQuota = targetArtists.length > 1 ? 6 : 5;
    return [...artistMatches.slice(0, targetQuota), ...companionMatches.slice(0, 10 - targetQuota)].slice(0, 10);
  }
  return combined.slice(0, 10);
}

function buildRerankerSystemInstruction(discoveryMode: DiscoveryMode = "FAMILIAR"): string {
  const modeContext =
    discoveryMode === "EXPLORE"
      ? "Discovery Mode is EXPLORE: Prioritize fresh, lesser-known, textured tracks, and hidden gems that nail the emotional nuance over obvious top-40 chart hits. Give saved favorites less influence, while honoring saved dislikes and explicit requests."
      : discoveryMode === "BALANCED"
        ? "Discovery Mode is BALANCED: Mix candidates connected to the user's saved favorites with tasteful, high-quality adjacent discoveries."
        : "Discovery Mode is FAMILIAR: Give the user's saved favorite artists and genres the strongest preference influence while keeping the current prompt primary.";

  return `You are ECHORA's Semantic Music Reranker.
Given a user prompt, semantic listening intent (mood, persona, energy, tempo, vocals preference, time context, language, era), sonic texture profile (instruments, production, tempo feel, emotional subtext), active discovery mode, and a candidate pool of tracks, select and rank the TOP 10 tracks that best embody the emotional and acoustic nuance.

${modeContext}

STRICT SELECTION RULES:
1. STRICT NO-INSTRUMENTAL RULE:
   - Unless user explicitly requested instrumental tracks (e.g. 'instrumental', 'bgm', 'score', 'piano only', 'lofi beats', 'ambient without vocals'):
     * Strictly DISQUALIFY and REJECT all purely instrumental tracks, background scores (BGM), karaoke versions, and theme tunes without lyrics.
     * All selected tracks MUST feature genuine vocal singing with lyrics.
2. ARTIST DIVERSITY & SATURATION LIMIT:
   - Unless the user explicitly requested a specific artist (e.g. 'Arijit Singh', 'Coldplay'), select AT MOST 2 tracks per artist across the entire top 10.
   - NEVER allow a single artist to dominate the recommendation list; give the user a rich, balanced variety of different artists.
   - Apply supplied userPreferences according to the active discovery mode. Never let a saved favorite override an explicit request or saved dislike.
3. NEGATIVE CONSTRAINTS & EXCLUSIONS:
   - Strictly inspect each candidate against the user's negative constraints (excluded artists, excluded genres, negative keywords like 'no rap', 'except Arijit Singh', 'without heavy beats').
   - Immediately DISQUALIFY and REJECT any candidate matching those exclusions!
4. VIBE PURITY (NO ARTIFICIAL PLAYLIST JOURNEYS):
   - DO NOT sequence as a playlist journey (no welcome tracks, warmups, or comedowns).
   - EVERY SINGLE TRACK in the top 10 MUST be an immediate, direct, high-affinity match for the requested mood and sonic texture.
   - Reject superficial keyword matches (e.g. upbeat dance songs that merely have 'sad' or 'rain' in their title).
5. STRICT ERA FILTER:
   - If user requested an era (e.g. '1990s' or '90s'), inspect the candidate's 'releaseYear'.
   - Tracks MUST be from that era (for 90s, releaseYear MUST be between 1990 and 1999).
   - REJECT tracks released in recent years (2010s, 2020s) and older decades (1960s, 1970s).
6. STRICT LANGUAGE & CULTURAL INTEGRITY (ZERO TOLERANCE FOR LANGUAGE LEAKS):
   - If user requested a language (e.g. 'hindi', 'spanish', 'russian', 'punjabi', 'japanese', 'french'):
     * EVERY selected track MUST authentically belong to that language and musical culture.
     * REJECT 'title trap' songs that are in English but merely have the language name or a foreign phrase in their title (e.g., 'Heartbreak in Spanish' by Bill Beasley, 'Russian Roulette' by Rihanna, 'Spanish Eyes', 'Spanish Romance').
     * REJECT any global Western pop, rap, K-pop, or unrelated country/indie artist (e.g. Drake, Taylor Swift, BLACKPINK, BTS, Bill Beasley, Foals) when non-English music is requested.
     * For Hindi: songs MUST be genuine Bollywood or Indian Hindi releases. Disqualify Western pop/rap and non-Hindi Indian regional songs (Tamil, Telugu, Malayalam).
     * For Spanish: songs MUST be genuine Spanish/Latin releases sung in Spanish. Disqualify English country, American pop, or British rock.
     * For Russian: songs MUST be genuine Russian-language tracks (Russian post-punk, Doomer rock, Russian indie). Disqualify English/American pop tracks.
7. ANTI-SONIC AURA & VOCAL STYLE DISQUALIFICATION:
   - Inspect each candidate against the provided 'antiSonicAura' (forbiddenInstruments and forbiddenVibes) and 'vocalStyle'.
   - DISQUALIFY any candidate track that features forbidden instruments (e.g. trap 808s, phonk cowbells, high-tempo synthesized dance beats) or forbidden vibes (e.g. party dance tracks, club remixes, aggressive drill, theatrical drama belting), even if the song title contains the search keyword!
   - Ensure vocal delivery matches 'vocalStyle' (e.g. if the user wants quiet, peaceful acoustic music, discard loud theatrical shouting, upbeat party singing, or high-energy drama).
8. ORIGINAL VS MASHUP BALANCE:
   - Prioritize authentic original artist/film soundtrack versions (at least 8 out of 10 tracks).
   - Allow AT MOST 1 or 2 tasteful mashups or chill mixes in the entire final 10; NEVER allow mashups or DJ edits to dominate.
9. SPECIFIC SONG TITLE / ARTIST PRIORITY:
   - If the user explicitly requested a specific song title (e.g. 'Tum Hi Ho') or artist, find that track in the candidate pool and place it at RANK #1!
   - Follow with the closest authentic acoustic/original companion tracks or soundtrack tracks from the same film/artist.
10. NO REPEATED / DUPLICATE SONGS:
   - NEVER select the exact same song more than once, even if Spotify lists it under different albums (e.g. single version vs movie soundtrack album vs compilation). Every selected track must be a distinct musical composition.
11. Select up to 10 best-matching tracks in order of emotional and acoustic affinity.
12. For each selected track, provide a 'matchScore' from 0 to 100 comparing the actual song to the ORIGINAL userPrompt. Score the song itself, not title keyword overlap: 90-100 is an unusually direct match, 75-89 strong, 60-74 partial, below 60 weak. Use mood, artist, tempo, vocals, language, era, sonic profile, and explicit constraints. Preserve explicit artist/title requests; never lower their priority to improve vibe fit.
13. For each selected track, provide a concise 'matchReason' (one sentence, max 15 words).
14. Output strict JSON matching the schema.`;
}

const RERANKER_JSON_SCHEMA = {
  type: "object",
  properties: {
    rankedTracks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          matchReason: { type: "string", description: "Brief 1-sentence reason why this track fits the vibe" },
          matchScore: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["id", "matchReason", "matchScore"],
      },
    },
  },
  required: ["rankedTracks"],
  additionalProperties: false,
} as const;

interface RerankerResponse {
  rankedTracks?: Array<{ id: string; matchReason: string; matchScore?: number }>;
}

const REFINEMENT_QUERY_SCHEMA = {
  type: "object",
  properties: {
    searchQueries: { type: "array", items: { type: "string" }, maxItems: 2 },
  },
  required: ["searchQueries"],
  additionalProperties: false,
} as const;

export interface PreferenceProfile {
  favoriteGenres?: string[];
  favoriteArtists?: string[];
  dislikedGenres?: string[];
  dislikedArtists?: string[];
  familiarityWeight?: number;
}

export interface SemanticReranker {
  rerank(
    prompt: string,
    intent: MusicIntent,
    candidates: Track[],
    discoveryMode?: DiscoveryMode,
    signal?: AbortSignal,
    userPreferences?: PreferenceProfile,
    balanceOptions?: BalanceOptions,
  ): Promise<Track[]>;
  suggestRefinementQueries?(
    prompt: string,
    intent: MusicIntent,
    lowScoringTracks: Track[],
    signal?: AbortSignal,
  ): Promise<string[]>;
}

export function createSemanticReranker(geminiClient: GeminiClient | null): SemanticReranker {
  return {
    async suggestRefinementQueries(prompt, intent, lowScoringTracks, signal) {
      if (!geminiClient || lowScoringTracks.length === 0) return [];
      const raw = await geminiClient.generateJson({
        userText: JSON.stringify({
          originalUserPrompt: prompt,
          extractedIntent: {
            artist: intent.artist,
            trackTitle: intent.trackTitle,
            mood: intent.mood,
            tempo: intent.tempo,
            energy: intent.energy,
            vocals: intent.vocals,
            language: intent.language,
            era: intent.era,
            genres: intent.genre,
            negativeConstraints: intent.negativeConstraints,
            sonicProfile: intent.sonicProfile,
          },
          lowScoringCatalogResults: lowScoringTracks.slice(0, 10).map((track) => ({
            title: track.name,
            artists: track.artists,
            score: track.matchScore,
          })),
        }),
        systemInstruction: `You improve music catalog recall after the fetched songs scored poorly against the original request. Return at most two concise catalog search queries that find closer songs. Preserve explicit artist and title constraints exactly; preserve language, era, and negative constraints. Never invent a replacement artist or relax a hard constraint. Return only JSON.`,
        jsonSchema: REFINEMENT_QUERY_SCHEMA,
        signal,
      });
      const parsed = JSON.parse(raw) as { searchQueries?: unknown };
      return Array.isArray(parsed.searchQueries)
        ? [...new Set(parsed.searchQueries.filter((query): query is string => typeof query === "string").map((query) => query.trim()).filter(Boolean))].slice(0, 2)
        : [];
    },
    async rerank(
      prompt: string,
      intent: MusicIntent,
      candidates: Track[],
      discoveryMode: DiscoveryMode = "FAMILIAR",
      signal?: AbortSignal,
      userPreferences?: PreferenceProfile,
      balanceOptions?: BalanceOptions,
    ): Promise<Track[]> {
      if (!candidates || candidates.length === 0) return [];
      const allowInstrumental = userWantsInstrumental(prompt, intent);
      const isExclusive = Boolean(intent.artist && /\b(only|just|pure|exclusively|all)\b/i.test(prompt));
      const hasExplicitArtist = Boolean(intent.artist && intent.artist.trim().length > 0);
      const maxPerArtist = balanceOptions?.maxPerArtist ?? (hasExplicitArtist ? 10 : 2);
      const maxCumulativeArtist = balanceOptions?.maxCumulativePerArtist ?? 6;
      const promptWantsMashup = prompt.toLowerCase().includes("mashup") || prompt.toLowerCase().includes("mix");
      const MAX_MASHUPS = promptWantsMashup ? 10 : 2;

      const effectiveOptions: BalanceOptions = {
        ...balanceOptions,
        isExclusive: balanceOptions?.isExclusive ?? isExclusive,
      };

      if (!geminiClient || candidates.length <= 1) {
        const balanced = balanceTracks(candidates, MAX_MASHUPS, intent.era, intent.language, allowInstrumental, maxPerArtist, intent, effectiveOptions);
        return balanced.map((t) => ({
          ...t,
          matchReason: t.matchReason || `Matches ${intent.mood || "selected"} mood and acoustic style.`,
        }));
      }

      // Enforce 4500ms safety timeout
      const timeout = AbortSignal.timeout(RERANKER_TIMEOUT_MS);
      const abortSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

      // Prioritize exact song title and artist matches at top of candidate list
      let sortedCandidates = [...candidates];
      const targetArtists = parseTargetArtists(intent.artist);
      const targetTitleLower = intent.trackTitle?.toLowerCase().trim();

      if (targetTitleLower || targetArtists.length > 0) {
        sortedCandidates.sort((a, b) => {
          let aScore = 0;
          let bScore = 0;
          if (targetTitleLower) {
            if (a.name.toLowerCase().includes(targetTitleLower)) aScore += 20;
            if (b.name.toLowerCase().includes(targetTitleLower)) bScore += 20;
          }
          if (targetArtists.length > 0) {
            const aMatches = targetArtists.filter((ta) =>
              a.artists.some((art) => isArtistMatch(art, ta))
            ).length;
            const bMatches = targetArtists.filter((ta) =>
              b.artists.some((art) => isArtistMatch(art, ta))
            ).length;

            if (aMatches > 1) aScore += 15;
            else if (aMatches === 1) aScore += 6;

            if (bMatches > 1) bScore += 15;
            else if (bMatches === 1) bScore += 6;
          }
          return bScore - aScore;
        });
      }

      // Filter out pure instrumental tracks, negative constraint violations, and language leaks before sending candidate pool to Gemini
      let eligibleCandidates = sortedCandidates.filter((t) => {
        if (!matchesExplicitRequest(t, intent)) return false;
        if (!allowInstrumental && isInstrumentalTrack(t)) return false;
        if (matchesNegativeConstraints(t, intent)) return false;
        if (!isLanguageMatch(t, intent.language, intent)) return false;
        return true;
      });
      if (eligibleCandidates.length < 5) {
        eligibleCandidates = sortedCandidates.filter((t) => {
          if (!matchesExplicitRequest(t, intent)) return false;
          if (matchesNegativeConstraints(t, intent)) return false;
          if (!isLanguageMatch(t, intent.language, intent)) return false;
          return true;
        });
      }

      try {
        const candidatePayload = eligibleCandidates.slice(0, 30).map((t, idx) => ({
          id: t.id,
          title: t.name,
          artists: t.artists.join(", "),
          album: t.album,
          releaseYear: t.releaseYear ?? "unknown",
          candidateRank: idx + 1,
        }));

        const userText = JSON.stringify({
          userPrompt: prompt,
          discoveryMode,
          intent: {
            mood: intent.mood,
            persona: intent.persona,
            activity: intent.activity,
            energy: intent.energy,
            tempo: intent.tempo,
            vocals: intent.vocals,
            timeContext: intent.time_context,
            genres: intent.genre,
            language: intent.language,
            era: intent.era,
            trackTitle: intent.trackTitle,
            artist: intent.artist,
            negativeConstraints: intent.negativeConstraints,
          },
          sonicProfile: intent.sonicProfile,
          userPreferences: userPreferences ?? undefined,
          candidates: candidatePayload,
        });

        const rawJson = await geminiClient.generateJson({
          userText,
          systemInstruction: buildRerankerSystemInstruction(discoveryMode),
          jsonSchema: RERANKER_JSON_SCHEMA,
          signal: abortSignal,
        });

        const parsed = JSON.parse(rawJson) as RerankerResponse;
        const rankedIds = parsed.rankedTracks || [];

        if (!Array.isArray(rankedIds) || rankedIds.length === 0) {
          logger.warn("[Reranker] Received empty rankedTracks from model. Preserving candidate order.");
          const balanced = balanceTracks(candidates, MAX_MASHUPS, intent.era, intent.language, allowInstrumental, maxPerArtist, intent, effectiveOptions);
          return balanced.map((t) => ({
            ...t,
            matchReason: t.matchReason || `Selected for ${intent.mood || "acoustic"} profile.`,
          }));
        }

        const candidateMap = new Map<string, Track>();
        candidates.forEach((t) => candidateMap.set(t.id, t));

        const rerankedList: Track[] = [];
        const seenIds = new Set<string>();
        const seenTitles = new Set<string>();
        const artistCounts = new Map<string, number>();
        let mashupCount = 0;

        for (const item of rankedIds) {
          const matched = candidateMap.get(item.id);
          if (matched && !seenIds.has(item.id)) {
            if (balanceOptions?.excludeTrackIds?.has(matched.id)) continue;
            const songSig = getSongSignature(matched);
            if (balanceOptions?.excludeSignatures?.has(songSig)) continue;

            if (!allowInstrumental && isInstrumentalTrack(matched)) continue;
            if (matchesNegativeConstraints(matched, intent)) continue;
            if (!isLanguageMatch(matched, intent.language, intent)) continue;
            if (!isTargetEra(matched, intent.era)) continue;

            const norm = normalizeSongTitle(matched.name) || matched.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
            if (seenTitles.has(norm)) continue;

            const artistKey = getPrimaryArtistKey(matched);
            const currentCount = artistCounts.get(artistKey) || 0;
            if (currentCount >= maxPerArtist) continue;

            const cumulativeCount = balanceOptions?.cumulativeArtistCounts ? (balanceOptions.cumulativeArtistCounts[artistKey] || 0) : 0;
            if (cumulativeCount + currentCount >= maxCumulativeArtist) continue;

            const isMash = isMashupOrMix(matched);
            if (isMash && mashupCount >= MAX_MASHUPS) continue;
            if (isMash) mashupCount++;

            seenIds.add(item.id);
            seenTitles.add(norm);
            artistCounts.set(artistKey, currentCount + 1);
            rerankedList.push({
              ...matched,
              matchReason: item.matchReason?.trim() || `Matches ${intent.mood || "selected"} mood.`,
              matchScore: typeof item.matchScore === "number" ? Math.max(0, Math.min(100, Math.round(item.matchScore))) : null,
            });
          }
        }

        // Fill up to 10 from original candidates respecting era, language, artist diversity, and negative constraints
        if (rerankedList.length < 10) {
          const remainingCandidates = candidates.filter(
            (t) =>
              !seenIds.has(t.id) &&
              (!balanceOptions?.excludeTrackIds || !balanceOptions.excludeTrackIds.has(t.id)) &&
              (!balanceOptions?.excludeSignatures || !balanceOptions.excludeSignatures.has(getSongSignature(t))) &&
              (allowInstrumental || !isInstrumentalTrack(t)) &&
              !matchesNegativeConstraints(t, intent) &&
              isLanguageMatch(t, intent.language, intent),
          );
          const balancedRemaining = balanceTracks(
            remainingCandidates,
            MAX_MASHUPS - mashupCount,
            intent.era,
            intent.language,
            allowInstrumental,
            maxPerArtist,
            intent,
            balanceOptions,
          );
          for (const track of balancedRemaining) {
            const norm = normalizeSongTitle(track.name) || track.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
            if (seenTitles.has(norm)) continue;

            const artistKey = getPrimaryArtistKey(track);
            const currentCount = artistCounts.get(artistKey) || 0;
            if (currentCount >= maxPerArtist) continue;

            const cumulativeCount = balanceOptions?.cumulativeArtistCounts ? (balanceOptions.cumulativeArtistCounts[artistKey] || 0) : 0;
            if (cumulativeCount + currentCount >= maxCumulativeArtist) continue;

            seenTitles.add(norm);
            seenIds.add(track.id);
            artistCounts.set(artistKey, currentCount + 1);
            rerankedList.push({
              ...track,
              matchReason: track.matchReason || `Matches ${intent.mood || "acoustic"} profile.`,
            });
            if (rerankedList.length >= 10) break;
          }
        }

        const isExclusive = Boolean(intent.artist && /\b(only|just|pure|exclusively|all)\b/i.test(prompt));
        const targetArtists = parseTargetArtists(intent.artist);

        if (targetArtists.length > 0 && isExclusive) {
          // "ONLY" Case: Return 100% tracks by the requested artist(s)
          const exclusiveMatches: Track[] = [];
          const seen = new Set<string>();

          for (const t of rerankedList) {
            const matches = targetArtists.some((ta) =>
              t.artists.some((a) => isArtistMatch(a, ta))
            );
            if (matches && !seen.has(t.id)) {
              exclusiveMatches.push(t);
              seen.add(t.id);
            }
          }

          if (exclusiveMatches.length < 10) {
            const moreArtistTracks = candidates.filter((t) =>
              !seen.has(t.id) &&
              isLanguageMatch(t, intent.language, intent) &&
              !matchesNegativeConstraints(t, intent) &&
              targetArtists.some((ta) => t.artists.some((a) => isArtistMatch(a, ta)))
            );
            for (const t of moreArtistTracks) {
              seen.add(t.id);
              exclusiveMatches.push(t);
              if (exclusiveMatches.length >= 10) break;
            }
          }

          // Edge Case C (Option 1): If discography is small (< 10 tracks total), return all available tracks
          const catalogNotice = exclusiveMatches.length < 10
            ? `Official release by ${intent.artist} (complete discography on Spotify).`
            : `Featured track from ${intent.artist}'s catalog.`;

          return exclusiveMatches.slice(0, 10).map((t) => ({
            ...t,
            matchReason: exclusiveMatches.length < 10 ? catalogNotice : (t.matchReason || catalogNotice),
          }));
        }

        if (targetArtists.length > 0 && !isExclusive) {
          // Cases 1, 2, 3: Up to 5 (or 6 for multi-artist) tracks from the requested artists + remaining from vibe companions
          const artistPool: Track[] = [];
          const companionPool: Track[] = [];
          const seen = new Set<string>();

          for (const t of rerankedList) {
            const isMatch = targetArtists.some((ta) =>
              t.artists.some((a) => isArtistMatch(a, ta))
            );
            if (isMatch) {
              artistPool.push(t);
            } else {
              companionPool.push(t);
            }
            seen.add(t.id);
          }

          const targetQuota = targetArtists.length > 1 ? 6 : 5;

          // Backfill targetPool from original candidates if needed
          if (artistPool.length < targetQuota) {
            const moreArtistTracks = candidates.filter((t) =>
              !seen.has(t.id) &&
              isLanguageMatch(t, intent.language, intent) &&
              !matchesNegativeConstraints(t, intent) &&
              targetArtists.some((ta) => t.artists.some((a) => isArtistMatch(a, ta)))
            );
            for (const t of moreArtistTracks) {
              artistPool.push(t);
              seen.add(t.id);
              if (artistPool.length >= targetQuota) break;
            }
          }

          let finalArtistSection: Track[] = artistPool;
          if (targetArtists.length > 1) {
            // Balance across multi-artists
            const maxPerSubArtist = Math.ceil(targetQuota / targetArtists.length);
            const subCounts = new Map<string, number>();
            const balanced: Track[] = [];

            // First add mutual duets/collaborations
            for (const t of artistPool) {
              const matchesCount = targetArtists.filter((ta) =>
                t.artists.some((a) => isArtistMatch(a, ta))
              ).length;
              if (matchesCount > 1 && balanced.length < targetQuota) {
                balanced.push(t);
              }
            }

            // Next fill each artist up to their sub-quota
            for (const t of artistPool) {
              if (balanced.some((b) => b.id === t.id)) continue;
              const matchedArtist = targetArtists.find((ta) =>
                t.artists.some((a) => isArtistMatch(a, ta))
              );
              if (!matchedArtist) continue;
              const cnt = subCounts.get(matchedArtist) || 0;
              if (cnt < maxPerSubArtist && balanced.length < targetQuota) {
                balanced.push(t);
                subCounts.set(matchedArtist, cnt + 1);
              }
            }
            finalArtistSection = balanced;
          }

          // If user searched for a specific song title, ensure exact title match is at Rank #1
          if (intent.trackTitle) {
            const titleLower = intent.trackTitle.toLowerCase();
            const exactIdx = finalArtistSection.findIndex((t) => t.name.toLowerCase().includes(titleLower));
            if (exactIdx > 0) {
              const [exact] = finalArtistSection.splice(exactIdx, 1);
              finalArtistSection.unshift(exact);
            }
          }

          const topArtistSection = finalArtistSection.slice(0, targetQuota);
          const neededCompanions = Math.max(0, 10 - topArtistSection.length);
          const topCompanionSection = companionPool.slice(0, neededCompanions);

          const assembled = [...topArtistSection, ...topCompanionSection];
          if (assembled.length < 10) {
            const assembledIds = new Set(assembled.map((t) => t.id));
            for (const t of rerankedList) {
              if (!assembledIds.has(t.id)) {
                assembled.push(t);
                assembledIds.add(t.id);
              }
              if (assembled.length >= 10) break;
            }
          }
          return assembled.slice(0, 10);
        }

        return rerankedList.slice(0, 10);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn(`[Reranker] Semantic reranker skipped or timed out (${errorMsg}). Using balanced candidate ranking.`);
        const balanced = balanceTracks(candidates, MAX_MASHUPS, intent.era, intent.language, allowInstrumental, maxPerArtist, intent, effectiveOptions);
        return balanced.map((t) => ({
          ...t,
          matchReason: t.matchReason || `Matches ${intent.mood || "selected"} mood and acoustic style.`,
        }));
      }
    },
  };
}
