// Probe the configured Gemini key: list the models the key can reach and test
// a minimal generateContent call against each candidate.
//
//   node scripts/probe-models.mjs
//
// Safe to run repeatedly: it only prints key prefix/length, never the secret.
import dotenv from "dotenv";

// Mirror server.ts load order: shared defaults first, developer secrets win.
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set (.env / .env.local).");
  process.exit(1);
}
console.log(`key prefix=${apiKey.slice(0, 6)} length=${apiKey.length}`);

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// 1) List models reachable with this key.
try {
  const res = await fetch(`${BASE}/models?key=${encodeURIComponent(apiKey)}`);
  const body = await res.json();
  if (!res.ok) {
    console.log(`LIST FAILED ${res.status}: ${JSON.stringify(body).slice(0, 400)}`);
  } else {
    const names = (body.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => String(m.name).replace(/^models\//, ""));
    console.log(`LIST OK (${names.length} generateContent models)`);
    console.log(names.join("\n"));
  }
} catch (err) {
  console.log(`LIST THREW: ${err.message}`);
}

// 2) Try a minimal generation against each candidate model.
const candidates = [
  process.env.GEMINI_MODEL,
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
  "gemini-flash-latest",
].filter(Boolean);

for (const model of candidates) {
  const started = Date.now();
  try {
    const res = await fetch(
      `${BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with the single word: OK" }] }],
        }),
      }
    );
    const body = await res.json();
    const ms = Date.now() - started;
    if (!res.ok) {
      console.log(`${model.padEnd(24)} FAIL ${res.status} ${JSON.stringify(body).slice(0, 220)}`);
      continue;
    }
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    console.log(`${model.padEnd(24)} OK   ${ms}ms  "${text.trim().slice(0, 40)}"`);
  } catch (err) {
    console.log(`${model.padEnd(24)} THREW ${err.message}`);
  }
}
