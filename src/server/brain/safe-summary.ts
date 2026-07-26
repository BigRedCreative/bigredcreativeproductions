import "server-only";
import { BRAIN_PROMPT_SUMMARY_MAX_LENGTH, BRAIN_RESPONSE_SUMMARY_MAX_LENGTH } from "@/data/brain";

// Phase 20A — deliberate summary construction, not "store the first N
// characters of whatever text we have." Both functions actively strip
// anything that shouldn't reach brain_requests (HTML-like tags, code
// fences, control characters, collapsed whitespace) BEFORE clamping to the
// approved max length — the clamp is a backstop, not the safety mechanism
// itself. See CLAUDE.md's Phase 20 architecture report and src/data/
// brain.ts's own comment on these two constants.
//
// v1 does not make a second AI call to summarize the response — that would
// double the cost of every single request for a cosmetic history-list
// improvement. Deterministic sanitize-then-truncate is judged sufficient
// for a short admin-facing history label; documented here honestly as a
// v1 choice, not hidden as if it were AI-generated.

// Strips ASCII control characters (code points 0-31 and 127) by code point
// comparison rather than a regex character class — deliberately avoids any
// literal control-byte escape sequence appearing in this source file.
function stripControlCharacters(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
    else out += " ";
  }
  return out;
}

function sanitizeForStorage(text: string): string {
  const noCodeFences = text.replace(/```[\s\S]*?```/g, " ");
  const noHtmlTags = noCodeFences.replace(/<[^>]*>/g, " ");
  const noControlChars = stripControlCharacters(noHtmlTags);
  return noControlChars.replace(/\s+/g, " ").trim();
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 40 ? cut.slice(0, lastSpace) : cut}…`;
}

export function buildPromptSummary(label: string, question: string): string {
  const combined = `${label}: ${question}`;
  return truncateAtWordBoundary(sanitizeForStorage(combined), BRAIN_PROMPT_SUMMARY_MAX_LENGTH);
}

export function buildResponseSummary(rawText: string): string {
  return truncateAtWordBoundary(sanitizeForStorage(rawText), BRAIN_RESPONSE_SUMMARY_MAX_LENGTH);
}
