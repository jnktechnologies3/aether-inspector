#!/usr/bin/env node
/**
 * Smoke test: ensure proxy is up, curl -x example.com, assert sessions non-empty.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const PROXY = "http://127.0.0.1:8888";
const STATUS = `${PROXY}/__inspector__/status`;
const SESSIONS = `${PROXY}/__inspector__/sessions`;

let spawned = null;

async function isUp() {
  try {
    const res = await fetch(STATUS);
    if (!res.ok) return false;
    const j = await res.json();
    return Boolean(j?.ok);
  } catch {
    return false;
  }
}

async function ensureProxy() {
  if (await isUp()) {
    console.log("[smoke] proxy already up");
    return;
  }
  console.log("[smoke] starting proxy…");
  spawned = spawn("npx", ["tsx", "server/src/index.ts"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  spawned.stdout.on("data", (d) => process.stdout.write(`[proxy] ${d}`));
  spawned.stderr.on("data", (d) => process.stderr.write(`[proxy] ${d}`));

  for (let i = 0; i < 40; i++) {
    await sleep(250);
    if (await isUp()) {
      console.log("[smoke] proxy ready");
      return;
    }
  }
  throw new Error("proxy failed to start within timeout");
}

async function runCurl() {
  console.log("[smoke] curl -x → http://example.com");
  const res = await fetch("http://example.com/", {
  }).catch(() => null);
  void res;

  const curl = spawn(
    "curl",
    ["-sS", "-o", "/tmp/aether-smoke-body.html", "-w", "%{http_code}", "-x", PROXY, "http://example.com/"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let out = "";
  let err = "";
  curl.stdout.on("data", (d) => (out += d));
  curl.stderr.on("data", (d) => (err += d));
  const code = await new Promise((resolve) => curl.on("close", resolve));
  if (code !== 0) {
    throw new Error(`curl failed (${code}): ${err || out}`);
  }
  console.log(`[smoke] curl http_code=${out.trim()}`);
}

async function assertSessions() {
  await sleep(300);
  const res = await fetch(SESSIONS);
  if (!res.ok) throw new Error(`sessions HTTP ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("sessions empty after curl — capture failed");
  }
  const hit = list.find((s) => String(s.url).includes("example.com"));
  if (!hit) {
    console.warn("[smoke] warning: no example.com session; first session:", list[0]);
  }
  console.log(`[smoke] ok — ${list.length} session(s); sample: ${list[0].method} ${list[0].url} → ${list[0].status}`);
}

function cleanup() {
  if (spawned && !spawned.killed) {
    spawned.kill("SIGTERM");
  }
}

async function main() {
  try {
    await ensureProxy();
    await runCurl();
    await assertSessions();
    console.log("[smoke] PASS");
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error("[smoke] FAIL:", err?.message || err);
    cleanup();
    process.exit(1);
  }
}

main();
