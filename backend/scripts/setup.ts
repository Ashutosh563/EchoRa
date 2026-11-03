import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import fs from "node:fs";
import { ENV_FILE, loadConfig, DEFAULT_GEMINI_MODEL } from "../src/config/env.js";
import { validateGeminiKey } from "../src/services/gemini/validateKey.js";
import { validateSpotifyCredentials } from "../src/services/spotify/validateCredentials.js";

async function promptSecret(rl: readline.Interface, promptText: string): Promise<string> {
  process.stdout.write(promptText);
  // Simple prompt for secure manual setup in local terminal
  const answer = await rl.question("");
  return answer.trim();
}

async function main() {
  console.log("\n=========================================");
  console.log("       SONORA Phase 1 Setup Wizard       ");
  console.log("=========================================\n");
  console.log("This wizard configures your backend API keys securely.");
  console.log("Credentials will be written to backend/.env (gitignored).\n");

  const existing = loadConfig();
  const rl = readline.createInterface({ input, output });

  try {
    // 1. Gemini API Key
    console.log("1. Google Gemini API Key");
    console.log("   (Get one from https://aistudio.google.com/app/apikey)");
    const currentGemini = existing.geminiApiKey ? `[configured: ...${existing.geminiApiKey.slice(-4)}]` : "[not configured]";
    const geminiKey = await promptSecret(rl, `   Enter Gemini API Key ${currentGemini} (press Enter to keep): `);
    const finalGeminiKey = geminiKey || existing.geminiApiKey || "";

    if (finalGeminiKey) {
      process.stdout.write("   Validating Gemini API Key... ");
      const check = await validateGeminiKey(finalGeminiKey, existing.geminiModel || DEFAULT_GEMINI_MODEL);
      if (check.ok) {
        console.log("✓ Valid!");
      } else {
        console.log(`✗ Validation failed: ${check.message}`);
        console.log("   (Saving anyway so you can test or fix later.)");
      }
    }

    // 2. Spotify Client ID
    console.log("\n2. Spotify Web API Application");
    console.log("   (Create an app at https://developer.spotify.com/dashboard)");
    console.log("   IMPORTANT: Add Redirect URI: http://127.0.0.1:4000/api/spotify/callback");
    const currentSpotifyId = existing.spotifyClientId ? `[configured: ...${existing.spotifyClientId.slice(-4)}]` : "[not configured]";
    const spotifyId = await promptSecret(rl, `   Enter Spotify Client ID ${currentSpotifyId} (press Enter to keep): `);
    const finalSpotifyId = spotifyId || existing.spotifyClientId || "";

    // 3. Spotify Client Secret
    const currentSpotifySecret = existing.spotifyClientSecret ? "[configured: hidden]" : "[not configured]";
    const spotifySecret = await promptSecret(rl, `   Enter Spotify Client Secret ${currentSpotifySecret} (press Enter to keep): `);
    const finalSpotifySecret = spotifySecret || existing.spotifyClientSecret || "";

    if (finalSpotifyId && finalSpotifySecret) {
      process.stdout.write("   Validating Spotify credentials... ");
      const check = await validateSpotifyCredentials(finalSpotifyId, finalSpotifySecret);
      if (check.ok) {
        console.log("✓ Valid!");
      } else {
        console.log(`✗ Validation failed: ${check.message}`);
        console.log("   (Saving anyway so you can test or fix later.)");
      }
    }

    // Write to backend/.env
    const envContent = [
      `# SONORA API Credentials`,
      `GEMINI_API_KEY=${finalGeminiKey}`,
      `GEMINI_MODEL=${existing.geminiModel || DEFAULT_GEMINI_MODEL}`,
      `SPOTIFY_CLIENT_ID=${finalSpotifyId}`,
      `SPOTIFY_CLIENT_SECRET=${finalSpotifySecret}`,
      ``,
    ].join("\n");

    fs.writeFileSync(ENV_FILE, envContent, { encoding: "utf8", mode: 0o600 });
    console.log(`\n✓ Successfully saved credentials to backend/.env (mode 0600)`);
    console.log("You can now start the application using: npm run dev\n");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});

