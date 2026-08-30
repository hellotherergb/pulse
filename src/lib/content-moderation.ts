/**
 * Text content policy scanner.
 * Blocks child-sexual-exploitation language and opens an admin ban request.
 * Not a substitute for human review or image/video scanning.
 */

export type ContentSource = "POST" | "STORY" | "MESSAGE" | "PIXEL" | "BIO";

export type ModerationHit = {
  reason: string;
  matched: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Explicit child-exploitation terms / slang (blocked + ban request). */
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
];

/** Sexual intent words used with age/minor cues. */
const SEXUAL_CUES =
  /\b(sex|sexy|sexual|porn|nude|nudes|naked|nsfw|fuck|fucking|rape|molest|groom|onlyfans|hentai|incest)\b/i;

/** Age / minor cues. */
const MINOR_CUES =
  /\b(child|children|kid|kids|toddler|infant|baby|babies|preteen|pre teen|underage|under age|minor|minors|little girl|little boy|schoolgirl|schoolboy|ped[o0]|loli|lolita|shota)\b/i;

/** Numeric ages that strongly imply under-18 when paired with sexual cues. */
const UNDERAGE_NUMBER =
  /\b([1-9]|1[0-7])\s*(y\/?o|yr|yrs|year|years|yo)\b|\b(eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)\s*(year|years|yo)?\b/i;

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
