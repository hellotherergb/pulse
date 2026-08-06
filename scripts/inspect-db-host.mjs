/**
 * Print only host/port facts for DATABASE_URL sources (no secrets).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function parseUrl(raw) {
  const v = String(raw || "").trim().replace(/^["']|["']$/g, "");
  try {
    const u = new URL(v);
    return {
      host: u.hostname,
      port: u.port || "default",
      db: u.pathname,
      neon: u.hostname.includes("neon.tech"),
      placeholder:
        u.username === "USER" ||
        /ep-xxxx|xxxx\.region|PASSWORD/.test(v) ||
        u.hostname === "ep-xxxx.region.aws.neon.tech",
    };
  } catch {
    return { error: true, length: v.length };
  }
}

function loadFile(file) {
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (m) return m[1];
  }
  return null;
}

const sources = [
  ["process.env", process.env.DATABASE_URL],
  [".env", loadFile(resolve(process.cwd(), ".env"))],
  [".env.local", loadFile(resolve(process.cwd(), ".env.local"))],
];

for (const [name, raw] of sources) {
  if (raw == null || raw === "") {
    console.log(`${name}: (unset)`);
    continue;
  }
  console.log(`${name}:`, JSON.stringify(parseUrl(raw)));
}
