// Minimal CDP driver for headless smoke-testing the FacheeBook production build.
const BASE = process.env.APP_URL || "http://localhost:4002";
const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const consoleErrors = [];
const record = (name, ok, detail) => results.push([name, ok ? "PASS" : "FAIL", String(detail).slice(0, 420)]);

async function getWsUrl() {
  const res = await fetch("http://127.0.0.1:9222/json/version");
  return (await res.json()).webSocketDebuggerUrl;
}

class Page {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.sessionId = null;
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.onEvent(msg);
      }
    });
  }
  onEvent(msg) {
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
      consoleErrors.push(msg.params.type + ": " + msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push("exception: " + String(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || "").slice(0, 200));
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consoleErrors.push("log: " + String(msg.params.entry.text).slice(0, 200));
    }
  }
  send(method, params = {}) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (this.sessionId) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("timeout " + method)); }
      }, 120000);
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval: " + r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
    return r.result.value;
  }
  // Injects a script file as a function body and calls it.
  async runFile(file, arg) {
    const src = fs.readFileSync(path.join(__dirname, file), "utf8");
    const expr = "(" + src + ")(" + JSON.stringify(arg === undefined ? null : arg) + ")";
    return this.eval(expr);
  }
}

async function main() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "fachee-cdp-"));
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    "--remote-debugging-port=9222", "--user-data-dir=" + userDataDir,
    "--window-size=1440,1000", "about:blank",
  ], { stdio: "ignore" });

  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try { wsUrl = await getWsUrl(); break; } catch { await sleep(500); }
  }
  if (!wsUrl) throw new Error("Chrome did not start");

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });

  const page = new Page(ws);
  const { targetId } = await page.send("Target.createTarget", { url: BASE });
  const { sessionId } = await page.send("Target.attachToTarget", { targetId, flatten: true });
  page.sessionId = sessionId;

  await page.send("Runtime.enable");
  await page.send("Log.enable");
  await page.send("Page.enable");
  await page.send("Page.navigate", { url: BASE });

  // Wait until the app has actually mounted before probing.
  var ready = false;
  for (var w = 0; w < 30; w++) {
    await sleep(1000);
    try {
      var st = await page.eval("(function(){var r=document.getElementById('root');return {c:r?r.children.length:0,t:(document.body.innerText||'').length};})()");
      if (st && st.c > 0 && st.t > 20) { ready = true; break; }
    } catch (e) { /* page still loading */ }
  }
  await sleep(2500);

  const shell = await page.runFile("smoke-scripts/shell.js");
  record("app-shell", shell.rootChildren > 0, "rootChildren=" + shell.rootChildren + " buttons=" + shell.buttonCount);
  record("localStorage", shell.lsOk, shell.lsMsg);

  // --- API-level AI checks -------------------------------------------------
  // These run before the browser flow so a broken AI backend fails fast and the
  // reason is visible in the report rather than hidden behind the UI.
  try {
    const health = await (await fetch(BASE + "/api/health")).json();
    record("api-health", health.status === "ok" && health.ai?.configured === true,
      "status=" + health.status + " ai.configured=" + health.ai?.configured +
      " model=" + health.ai?.model + " chain=" + (health.ai?.modelChain || []).length);
  } catch (e) {
    record("api-health", false, "error: " + e.message);
  }

  // Assert every AI endpoint really served by Gemini. The offline fallback is
  // deliberately high quality, so without the `source` tag a broken AI path is
  // indistinguishable from a working one.
  const aiCases = [
    { name: "ai-study-summary", path: "/api/study-summary", body: { title: "Photosynthesis", subject: "Biology", notes: "chlorophyll absorbs light" } },
    { name: "ai-generate-quiz", path: "/api/ai-generate-quiz", body: { title: "Photosynthesis", subject: "Biology", keyTakeaways: ["Chlorophyll absorbs red and blue light", "The Calvin cycle fixes CO2"] } },
    { name: "ai-study-tip", path: "/api/ai-study-tip", body: { topic: "Photosynthesis", category: "active_recall" } },
  ];
  for (const c of aiCases) {
    const t0 = Date.now();
    try {
      const res = await fetch(BASE + c.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c.body),
      });
      const json = await res.json();
      const elapsed = Date.now() - t0;
      const isAi = json.source === "ai";
      record(c.name + "-source", isAi,
        "source=" + json.source + " model=" + (json.model || "n/a") + " http=" + res.status + " " + elapsed + "ms" +
        (isAi ? "" : " :: FELL BACK TO OFFLINE CONTENT"));
    } catch (e) {
      record(c.name + "-source", false, "error: " + e.message);
    }
  }

  // The app is behind Supabase auth. Inject a local session so the UI is
  // reachable without depending on email confirmation / Supabase rate limits.
  const SB_HOST = process.env.SUPABASE_HOST || "tfjheiyzphvjjgidwjyq.supabase.co";
  const isAuthScreen = /sign in|create account|cloud setup|local library/i.test(shell.text || "");
  if (isAuthScreen) {
    const email = "smoke.tester." + Date.now() + "@gmail.com";
    const su = await page.runFile("smoke-scripts/signup.js", { host: SB_HOST, email });
    record("auth-inject", su.ok, su.reason || ("key=" + su.key));
    // Reload so AuthGate picks the injected session up.
    await page.send("Page.reload", {});
    await sleep(9000);
    const after = await page.runFile("smoke-scripts/shell.js");
    const signedIn = !/sign in|create account|cloud setup/i.test(after.text || "");
    record("auth-signed-in", signedIn, "text=" + String(after.text).replace(/\s+/g, " ").slice(0, 200));
  } else {
    record("auth-signed-in", true, "already authenticated");
  }

  // Seed a material with key takeaways so flashcards/quiz have real content.
  const seed = await page.runFile("smoke-scripts/seed.js");
  record("seed-material", seed.ok, seed.reason || ("id=" + seed.id + " takeaways=" + seed.takeaways));
  if (seed.ok) {
    await page.send("Page.reload", {});
    await sleep(9000);
  }

  const fc = await page.runFile("smoke-scripts/flashcards.js");
  record("flashcards-open", fc.ok, fc.reason || "dialog text: " + String(fc.text).replace(/\s+/g, " ").slice(0, 200));

  if (fc.ok) {
    const flip = await page.runFile("smoke-scripts/flip.js");
    record("flashcards-flip", flip.changed, "buttons: " + JSON.stringify(flip.buttons));

    const rate = await page.runFile("smoke-scripts/rate.js");
    record("flashcards-rate", rate.ok, JSON.stringify(rate));

    const close = await page.runFile("smoke-scripts/close.js");
    record("flashcards-close", close.ok, close.msg);
    await sleep(1200);
  }

  const quiz = await page.runFile("smoke-scripts/quiz-open.js");
  record("quiz-ui-open", quiz.ok, quiz.reason || "clicked: " + quiz.clicked);

  if (quiz.ok) {
    const qr = await page.runFile("smoke-scripts/quiz-wait.js");
    record("quiz-generated", qr.ok, "elapsed=" + qr.elapsed + "ms :: " + String(qr.sample).replace(/\s+/g, " ").slice(0, 260));
  }

  const cal = await page.runFile("smoke-scripts/calendar.js");
  record("study-calendar", cal.ok && cal.hasCalendar, JSON.stringify(cal).slice(0, 280));

  const gam = await page.runFile("smoke-scripts/gamification.js");
  record("gamification", gam.hasXP, gam.sample);

  console.log("\n=== SMOKE TEST RESULTS ===");
  for (const [name, status, detail] of results) {
    console.log((status === "PASS" ? "PASS  " : "FAIL  ") + name + "  ::  " + detail);
  }
  console.log("\n=== CONSOLE ERRORS (" + consoleErrors.length + ") ===");
  console.log(consoleErrors.slice(0, 12).join("\n") || "(none)");

  chrome.kill();
  process.exit(results.every((r) => r[1] === "PASS") ? 0 : 1);
}

main().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });

