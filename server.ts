import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load env files before any endpoint reads process.env.
// `.env` holds shared defaults; `.env.local` holds developer secrets (e.g. GEMINI_API_KEY)
// and is gitignored, so it intentionally wins over both `.env` and any ambient shell value.
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

// Model used for all AI generation. `gemini-2.5-flash` was retired for new API keys,
// so we default to the current flash model and allow overriding it via env.
//
// Gemini enforces the free-tier request quota PER MODEL. When one model's daily
// quota is exhausted, every request to that model fails with 429 RESOURCE_EXHAUSTED
// even though the key is perfectly valid. To avoid a single exhausted model taking
// the whole AI feature down, we keep an ordered fallback chain: try the primary
// model first, then the alternatives, and only fall back to canned content if every
// candidate is unavailable.
//
// GEMINI_FALLBACK_MODELS is a comma-separated list; it defaults to models that are
// reachable with the same key. Verify what your key can reach with:
//   node scripts/probe-models.mjs
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Primary model first, then the fallbacks, without duplicates.
const AI_MODEL_CHAIN: string[] = [
  ...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]),
];

// Every AI endpoint can fall back to an offline response when the key is missing
// or Gemini errors out. The fallback is deliberately high quality, which means a
// caller cannot tell real AI output from a canned answer by shape alone. We tag
// every response with `source` so clients and smoke tests can verify that the
// real Gemini path actually served the request.
const AI_SOURCE_AI = "ai";
const AI_SOURCE_FALLBACK = "fallback";

// Generative requests can take 30s+ under load, so the AI call budget is generous.
// The HTTP layer (and the browser client) must be allowed to wait at least this long.
// The budget covers the WHOLE model chain, so it must be comfortably larger than
// a single attempt (see AI_ATTEMPT_TIMEOUT_MS) times the number of candidates.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 120000;

// Per-attempt ceiling. The model chain can contain several candidates, so a
// single hung call must not consume the whole request budget. The SDK accepts
// an AbortSignal, which also releases the underlying socket.
const AI_ATTEMPT_TIMEOUT_MS = Number(process.env.AI_ATTEMPT_TIMEOUT_MS) || 20000;

// Gemini intermittently answers 503 UNAVAILABLE ("high demand") even for a valid key.
// Without a retry the app silently degrades to the offline fallback, which looks like
// success to the user. We retry those transient failures with a short backoff.
//
// A 429 RESOURCE_EXHAUSTED is different: on the free tier it usually means the
// *daily* quota is exhausted (the error even asks us to retry in ~17h). Retrying that
// is pointless and only burns attempts, so quota errors are classified as
// non-retryable and fail over to the fallback immediately.
const AI_MAX_ATTEMPTS = Number(process.env.AI_MAX_ATTEMPTS) || 3;
const AI_RETRY_BASE_DELAY_MS = Number(process.env.AI_RETRY_BASE_DELAY_MS) || 800;

/** True when the error is a hard quota/limit rejection that a retry cannot fix. */
function isQuotaAiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|quota exceeded|exceeded your current quota/i.test(message);
}

/** True when an error looks like a transient upstream condition worth retrying. */
function isTransientAiError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  // Quota exhaustion is never transient: the limit resets on a daily or per-minute window.
  if (isQuotaAiError(err)) return false;
  // An aborted or timed-out attempt means the model did not answer in time. The
  // next model in the chain may still be healthy, so treat it as transient.
  if (/abort|timeout|timed out|ETIMEDOUT/i.test(message)) return true;
  return /\b(500|502|503|504)\b/.test(message) || /UNAVAILABLE|high demand|overloaded|503/i.test(message);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs a Gemini generateContent call against the configured model chain.
 *
 * Two independent failure modes are handled:
 *  - Transient upstream errors (503 "high demand") are retried with backoff on
 *    the same model.
 *  - Per-model quota exhaustion (429 RESOURCE_EXHAUSTED) is NOT retryable on the
 *    same model, but another model in the chain may still have quota, so we
 *    advance to the next candidate.
 *
 * @param label short endpoint name used in log lines
 * @returns the raw JSON text produced by the model
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  label: string,
  contents: string,
): Promise<{ text: string; model: string }> {
  let lastError: unknown;

  for (let m = 0; m < AI_MODEL_CHAIN.length; m++) {
    const model = AI_MODEL_CHAIN[m];

    for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            // Bound every individual call so one unresponsive model cannot consume
            // the entire request budget that the whole model chain has to share.
            httpOptions: { timeout: AI_ATTEMPT_TIMEOUT_MS },
          },
        });
        const text = response.text;
        if (!text) throw new Error("No response");
        if (attempt > 1) {
          console.warn(`${label}: AI call succeeded on attempt ${attempt}/${AI_MAX_ATTEMPTS} (${model}).`);
        } else if (m > 0) {
          console.warn(`${label}: primary model ${AI_MODEL_CHAIN[0]} unavailable, served by fallback model ${model}.`);
        }
        return { text, model };
      } catch (err) {
        lastError = err;
        const canRetry = attempt < AI_MAX_ATTEMPTS && isTransientAiError(err);
        if (!canRetry) {
          if (isQuotaAiError(err)) {
            // Quota is enforced per model, so another candidate may still work.
            console.warn(
              `${label}: model ${model} is out of quota (RESOURCE_EXHAUSTED); ` +
                `trying the next model in the chain.`,
            );
          } else {
            console.error(`${label}: model ${model} failed and cannot be retried:`, (err as Error)?.message ?? err);
          }
          break; // move on to the next model in the chain
        }
        const delay = AI_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        console.warn(
          `${label}: transient AI failure on ${model} (attempt ${attempt}/${AI_MAX_ATTEMPTS}), retrying in ${delay}ms:`,
          (err as Error)?.message ?? err,
        );
        await sleep(delay);
      }
    }
  }

  console.error(
    `${label}: every model in the chain failed; serving the offline fallback.`,
    (lastError as Error)?.message ?? lastError,
  );
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-initialized Google GenAI client
let genAiClient: GoogleGenAI | null = null;
function getGenAi(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    genAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "FacheeBook",
    time: new Date().toISOString(),
    // Reports AI readiness without ever echoing the secret. `model` mirrors the
    // value the server actually uses, so a misconfigured GEMINI_MODEL is visible.
    ai: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: GEMINI_MODEL,
      // The full candidate chain used when a model is out of quota or overloaded.
      modelChain: AI_MODEL_CHAIN,
    },
  });
});

// Endpoint: Generate Study Takeaways & Flashcards from Reading Material Notes
app.post("/api/study-summary", async (req, res) => {
  try {
    const { title, subject, notes, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const ai = getGenAi();
    if (!ai) {
      // High-quality smart fallback if API key is not configured
      return res.json({
        summary: `Key study breakdown for "${title}" (${subject || 'General Studies'}): Focus on foundational core theorems, verify practical edge cases, and test memory through spaced active recall.`,
        keyTakeaways: [
          `Master the fundamental definitions and mechanics of ${title}.`,
          `Analyze practical applications and common exam problem patterns.`,
          `Synthesize notes into one-sentence visual memory anchors.`,
          `Review mistakes within 24 hours to guarantee long-term retention.`,
        ],
        flashcards: [
          {
            front: `What is the primary concept and objective in ${title}?`,
            back: notes ? notes.slice(0, 160) : `The core goal of ${title} is understanding the underlying system principles and execution.`,
          },
          {
            front: `How do you identify exam traps regarding ${title}?`,
            back: `Watch for edge constraints, baseline conditions, and assumptions made during problem formulations.`,
          },
        ],
        studyTip: `For ${subject || 'this course'}, build 3-minute voice explanations or scribble quick diagrams on blank paper before sleeping.`,
        source: AI_SOURCE_FALLBACK,
      });
    }

    const prompt = `You are an academic learning coach for students at 'FacheeBook'.
Analyze the following reading material and produce a structured JSON response:
Title: ${title}
Subject: ${subject || 'General'}
Description: ${description || ''}
Notes/Content: ${notes || 'No detailed notes provided'}

Respond strictly with valid JSON with keys:
{
  "summary": "2-sentence high-impact academic overview",
  "keyTakeaways": ["4 clear, exam-tested bullet points"],
  "flashcards": [
    {"front": "Question/Prompt 1", "back": "Precise answer 1"},
    {"front": "Question/Prompt 2", "back": "Precise answer 2"},
    {"front": "Question/Prompt 3", "back": "Precise answer 3"}
  ],
  "studyTip": "One actionable high-retention study technique specifically for this topic"
}`;

    const generatePromise = generateWithRetry(ai, "study-summary", prompt);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), AI_TIMEOUT_MS)
    );

    const { text, model } = await Promise.race([generatePromise, timeoutPromise]);
    if (!text) throw new Error("No response");

    const parsed = JSON.parse(text);
    return res.json({ ...parsed, source: AI_SOURCE_AI, model });
  } catch (err) {
    console.warn("AI Study Summary fallback triggered:", (err as Error).message);
    const { title, subject, notes } = req.body;
    return res.json({
      summary: `Academic synthesis for ${title}: Review foundational definitions, clarify key mechanisms, and summarize takeaways in your own words.`,
      keyTakeaways: [
        `Understand core formulas and definitions in ${title}.`,
        `Contrast theoretical models with real-world student practice problems.`,
        `Practice active recall by testing memory without opening the notes.`,
      ],
      flashcards: [
        {
          front: `What is the primary theorem or mechanism in ${title}?`,
          back: notes?.slice(0, 140) || `Core concept emphasizing structured problem solving.`,
        },
      ],
      studyTip: `Set a 25-minute Pomodoro timer and write out the main mechanism from memory on a blank sheet.`,
      source: AI_SOURCE_FALLBACK,
    });
  }
});

// Endpoint: Generate Community Study Tip
app.post("/api/ai-study-tip", async (req, res) => {
  try {
    const { topic, category } = req.body;
    const ai = getGenAi();
    if (!ai) {
      return res.json({
        title: `Rapid Recall System for ${topic || 'Exams'}`,
        content: `When reviewing ${topic || 'complex reading'}, use the 'Teach-Back' rule: summarize the chapter in 60 seconds into a voice memo. Listening to your own explanation exposes gaps immediately.`,
        tags: ['Active Recall', 'Voice Notes', 'Fachee Tip'],
        source: AI_SOURCE_FALLBACK,
      });
    }

    const tipPromise = generateWithRetry(ai, "ai-study-tip", `Generate a practical, memorable student study tip for FacheeBook regarding "${topic || 'effective studying'}" in category "${category || 'active_recall'}".
Return JSON:
{
  "title": "Punchy Catchy Title",
  "content": "Actionable 2-3 sentence tip describing exact steps",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`);

    const tipTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Study tip generation timeout")), AI_TIMEOUT_MS);
    });

    const { text, model } = await Promise.race([tipPromise, tipTimeout]);

    if (text) {
      return res.json({ ...JSON.parse(text), source: AI_SOURCE_AI, model });
    }
    throw new Error("Empty AI text");
  } catch (err) {
    console.warn("AI Study Tip fallback triggered:", (err as Error).message);
    res.json({
      title: `Micro-Interleaving Method`,
      content: `Alternate between two related subjects (e.g. 45 mins of problem sets, followed by 30 mins of reading). Switching contexts forces the brain to re-categorize information, boosting test-day retention by up to 25%.`,
      tags: ['Interleaving', 'Focus', 'Retention'],
      source: AI_SOURCE_FALLBACK,
    });
  }
});

// Endpoint: Generate AI Practice Quiz from Study Material
app.post("/api/ai-generate-quiz", async (req, res) => {
  try {
    const { title, subject, keyTakeaways, notes, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const ai = getGenAi();
    if (!ai) {
      const takeaways = Array.isArray(keyTakeaways) ? keyTakeaways : [];
      const fallbackQuestions = takeaways.slice(0, 3).map((takeaway: string, index: number) => ({
        type: "multiple_choice",
        question: `What is a key concept from "${title}"?`,
        options: [
          takeaway.slice(0, 80),
          "This is not directly related to the material",
          "A general concept that may not apply here",
          "An unrelated topic from a different subject",
        ],
        correctAnswer: "0",
        explanation: takeaway,
        difficulty: "medium",
        points: 10,
      }));

      return res.json({
        questions: fallbackQuestions.length > 0 ? fallbackQuestions : [
          {
            type: "multiple_choice",
            question: `What is the main topic of "${title}"?`,
            options: [subject || "General Studies", "Mathematics", "History", "Literature"],
            correctAnswer: "0",
            explanation: `This material covers ${title} in the subject area of ${subject || 'general studies'}.`,
            difficulty: "easy",
            points: 10,
          },
        ],
        source: AI_SOURCE_FALLBACK,
      });
    }

    const takeawaysText = Array.isArray(keyTakeaways) ? keyTakeaways.join('\n- ') : (keyTakeaways || '');
    const prompt = `You are an academic quiz generator for FacheeBook, a student learning platform.

Generate a practice quiz with 3-5 questions based on this study material:

Title: ${title}
Subject: ${subject || 'General Studies'}
Description: ${description || ''}
Key Takeaways:
${takeawaysText || 'No key takeaways provided'}
Notes: ${notes || 'No notes provided'}

Requirements:
- Mix of question types: multiple_choice, true_false, short_answer
- Each question must have a clear correct answer
- Include explanations for why answers are correct
- Assign difficulty: easy, medium, or hard
- Assign points: 5-15 per question
- Focus on key concepts and exam-relevant content

Respond strictly with valid JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "0",
      "explanation": "Why this answer is correct",
      "difficulty": "medium",
      "points": 10
    }
  ]
}`;

    const generatePromise = generateWithRetry(ai, "ai-generate-quiz", prompt);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Quiz generation timeout")), AI_TIMEOUT_MS);
    });

    const { text, model } = await Promise.race([generatePromise, timeoutPromise]);
    if (!text) throw new Error("No response");

    const parsed = JSON.parse(text);
    return res.json({ ...parsed, source: AI_SOURCE_AI, model });
  } catch (err) {
    console.warn("AI Quiz generation fallback triggered:", (err as Error).message);
    const { title, subject, keyTakeaways } = req.body;
    const takeaways = Array.isArray(keyTakeaways) ? keyTakeaways : [];
    const takeawayQuestions = takeaways.slice(0, 3).map((takeaway: string) => ({
      type: "multiple_choice",
      question: `What is a key concept from "${title}"?`,
      options: [
        takeaway.slice(0, 80),
        "This is not directly related to the material",
        "A general concept that may not apply here",
        "An unrelated topic from a different subject",
      ],
      correctAnswer: "0",
      explanation: takeaway,
      difficulty: "medium",
      points: 10,
    }));

    return res.json({
      questions: takeawayQuestions.length > 0 ? takeawayQuestions : [
        {
          type: "multiple_choice",
          question: `What is the main topic of "${title}"?`,
          options: [subject || "General Studies", "Mathematics", "History", "Literature"],
          correctAnswer: "0",
          explanation: `This material covers ${title} in the subject area of ${subject || 'general studies'}.`,
          difficulty: "easy",
          points: 10,
        },
        {
          type: "true_false",
          question: "You can access this material for study review anytime.",
          correctAnswer: "true",
          explanation: "Saved materials in FacheeBook remain available for review unless deleted.",
          difficulty: "easy",
          points: 5,
        },
      ],
      source: AI_SOURCE_FALLBACK,
    });
  }
});

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.argv[1] && process.argv[1].includes("dist")) ||
    (typeof __filename !== "undefined" && __filename.includes("dist"));

  // Unmatched /api/* routes must return JSON, never the SPA shell, so client
  // `res.json()` calls fail with a clear error instead of a parse exception.
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `Unknown API endpoint: ${req.method} /api${req.path}` });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FacheeBook server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
