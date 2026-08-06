/**
 * Quick check that required cloud env vars are present (does not print secrets).
 * Usage: node scripts/check-cloud.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// Prefer project .env over inherited shell env so placeholders are not masked.
const shellEnv = { ...process.env };
for (const key of [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "BLOB_READ_WRITE_TOKEN",
]) {
  delete process.env[key];
}
loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));
// Fall back to shell only when project files omit the key.
for (const key of [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "BLOB_READ_WRITE_TOKEN",
]) {
  if (!process.env[key] && shellEnv[key]) process.env[key] = shellEnv[key];
}

function isRealNeonUrl(v) {
  if (typeof v !== "string") return false;
  if (!(v.startsWith("postgresql://") || v.startsWith("postgres://"))) {
    return false;
  }
  if (/USER:PASSWORD|ep-xxxx|xxxx\.region|PASSWORD@/.test(v)) return false;
  try {
    const u = new URL(v);
    return (
      u.hostname.includes("neon.tech") &&
      u.username !== "USER" &&
      u.hostname !== "localhost" &&
      u.hostname !== "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const checks = [
  {
    key: "DATABASE_URL",
    ok: isRealNeonUrl,
    hint: "Paste your real Neon pooled connection string into .env (see DEPLOY.md)",
  },
  {
    key: "NEXTAUTH_SECRET",
    ok: (v) =>
      typeof v === "string" &&
      v.length >= 32 &&
      !/replace-with|change-me|dev-secret/i.test(v),
    hint: "Set a long random secret (32+ chars, not a placeholder)",
  },
  {
    key: "NEXTAUTH_URL",
    ok: (v) =>
      typeof v === "string" &&
      (v.startsWith("http://") || v.startsWith("https://")),
    hint: "http://localhost:3000 locally, https://your-app.vercel.app in prod",
  },
  {
    key: "BLOB_READ_WRITE_TOKEN",
    ok: (v) => typeof v === "string" && v.length > 10,
    hint: "From Vercel Storage → Blob (optional for local disk uploads)",
    optional: true,
  },
];

let failed = 0;
for (const c of checks) {
  const v = process.env[c.key];
  const pass = c.ok(v);
  if (pass) {
    console.log(`OK   ${c.key}`);
  } else if (c.optional) {
    console.log(`WARN ${c.key} — ${c.hint}`);
  } else {
    console.log(`FAIL ${c.key} — ${c.hint}`);
    failed++;
  }
}

if (failed) {
  console.log("\nSee DEPLOY.md for setup steps.");
  process.exit(1);
}
console.log("\nCloud env looks ready. Run: npx prisma migrate deploy");
