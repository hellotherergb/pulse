/**
 * Text content policy scanner.
 * Catches obvious terms, obfuscation (spaced/leet letters), and common
 * grooming / age+sexual patterns. Not a substitute for human reports or image AI.
 */

export type ContentSource =
  | "POST"
  | "STORY"
  | "MESSAGE"
  | "PIXEL"
  | "BIO"
  | "REPORT";

export type ModerationHit = {
  reason: string;
  matched: string;
};

/** Strip leet / spacing tricks so "p e d 0" ≈ "pedo". */
function normalize(text: string): string {
  let s = text
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/\$/g, "s");

  // Collapse "a b c d" / "a.b.c" letter runs into words.
  s = s.replace(
    /(?:^|[^a-z])((?:[a-z][\s._*\-·]+){2,}[a-z])(?=[^a-z]|$)/g,
    (chunk) => ` ${chunk.replace(/[\s._*\-·]/g, "")} `,
  );

  return s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const CRITICAL_TERMS = [
  "pedophile",
  "paedophile",
  "pedophilia",
  "paedophilia",
  "pedo",
  "paedo",
  "child porn",
  "childporn",
  "child sex",
  "childsex",
  "kids porn",
  "kid porn",
  "underage porn",
  "underage sex",
  "infant porn",
  "baby porn",
  "cp trade",
  "cp for",
  "trade cp",
  "loli porn",
  "shota porn",
  "preteen sex",
  "pre teen sex",
  "minor porn",
  "rape kid",
  "rape child",
  "molest kid",
  "molest child",
  "childlover",
  "boylover",
  "girllover",
  "maptail",
];

const SEXUAL_CUES =
  /\b(sex|sexy|sexual|porn|porno|xxx|nude|nudes|naked|nsfw|fuck|fucking|rape|molest|groom|grooming|onlyfans|hentai|incest|horn?y|dm me pics|send nudes|trade pics|snap)\b/;

const MINOR_CUES =
  /\b(child|children|kid|kids|toddler|infant|baby|babies|preteen|pre teen|underage|under age|minor|minors|little girl|little boy|schoolgirl|schoolboy|ped[o0]|loli|lolita|shota|yng|yung|young teen|not eighteen|not 18|under 18|u18)\b/;

const UNDERAGE_NUMBER =
  /\b([8-9]|1[0-7])\s*(y\/?o|yr|yrs|year|years|yo)\b|\b(eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)\s*(year|years|yo)?\b/;

/** Soft / coded solicitation patterns (still need human review for edge cases). */
const GROOMING_PATTERNS: { re: RegExp; label: string }[] = [
  {
    re: /\b(looking for|lf|iso|any)\b.{0,48}\b(young|yng|yung|little|kid|child|underage|teen girl|teen boy)\b/,
    label: "seeking young",
  },
  {
    re: /\b(young|yng|yung|little)\b.{0,36}\b(girl|boy|pics|nudes|snap|discord|dm)\b/,
    label: "young+contact/pics",
  },
  {
    re: /\bage\s*(is\s*)?(just\s*)?(a\s*)?number\b/,
    label: "age is just a number",
  },
  {
    re: /\bno\s*age\s*limit\b|\bage\s*play\b|\bddlg\b|\blittle\s*space\b.{0,20}\b(sex|nude|daddy)\b/,
    label: "age-play solicitation",
  },
  {
    re: /\b(12|13|14|15|16|17)\s*[-–to]{1,3}\s*(12|13|14|15|16|17)\b.{0,40}\b(sex|nude|porn|pics|chat)\b/,
    label: "underage age-range",
  },
  {
    re: /\b(real|actually)\s*(12|13|14|15|16|17|underage|a kid)\b.{0,40}\b(sex|nude|porn|pics|chat|dm)\b/,
    label: "claims real minor",
  },
];

export function scanUserContent(raw: string): ModerationHit | null {
  const text = raw?.trim();
  if (!text) return null;

  const n = normalize(text);

  for (const term of CRITICAL_TERMS) {
    if (n.includes(term)) {
      return {
        reason: "Child sexual exploitation language",
        matched: term,
      };
    }
  }

  for (const { re, label } of GROOMING_PATTERNS) {
    if (re.test(n)) {
      return {
        reason: "Possible grooming / underage solicitation",
        matched: label,
      };
    }
  }

  const hasSexual = SEXUAL_CUES.test(n);
  const hasMinor = MINOR_CUES.test(n) || UNDERAGE_NUMBER.test(n);

  if (hasSexual && hasMinor) {
    return {
      reason: "Sexual content involving minors",
      matched: "age+sexual combination",
    };
  }

  return null;
}

export function snippetForAdmin(raw: string, max = 240): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
