/**
 * Push required Pulse env vars to the linked Vercel project (no stdout of secrets).
 * Usage: node scripts/push-vercel-env.mjs
 * Optional: PULSE_NEXTAUTH_URL=https://….vercel.app node scripts/push-vercel-env.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";

function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

const local = { ...loadEnv(resolve(".env")), ...loadEnv(resolve(".env.local")) };

const databaseUrl = local.DATABASE_URL;
const secret = local.NEXTAUTH_SECRET;
if (!databaseUrl || databaseUrl.includes("USER:PASSWORD")) {
  console.error("FAIL: set a real DATABASE_URL in .env first");
  process.exit(1);
}
if (!secret || /replace-with|change-me/i.test(secret)) {
  console.error("FAIL: set a real NEXTAUTH_SECRET in .env first");
  process.exit(1);
}

const nextAuthUrl =
  process.env.PULSE_NEXTAUTH_URL ||
  local.NEXTAUTH_URL_PROD ||
  "https://postinpulse.com";

const pairs = [
  ["DATABASE_URL", databaseUrl],
  ["NEXTAUTH_SECRET", secret],
  ["NEXTAUTH_URL", nextAuthUrl],
];

if (local.BLOB_READ_WRITE_TOKEN) {
  pairs.push(["BLOB_READ_WRITE_TOKEN", local.BLOB_READ_WRITE_TOKEN]);
}

const targets = ["production", "preview"];

for (const [key, value] of pairs) {
  for (const target of targets) {
    const r = spawnSync(
      "npx",
      [
        "vercel",
        "env",
        "add",
        key,
        target,
        "--value",
        value,
        "--sensitive",
        "--force",
        "--yes",
      ],
      { encoding: "utf8", shell: true },
    );
    if (r.status !== 0) {
      console.error(
        `FAIL set ${key} (${target}):`,
        (r.stderr || r.stdout || "").slice(0, 400),
      );
      process.exit(1);
    }
    console.log(`OK   ${key} → ${target}`);
  }
}

console.log("NEXTAUTH_URL set to:", nextAuthUrl);
console.log("Done.");
