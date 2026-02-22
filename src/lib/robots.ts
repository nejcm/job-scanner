/**
 * Phase 2: Check robots.txt before crawling a URL.
 * Only use for sites that explicitly allow crawling; do not bypass.
 */

const ROBOTS_CACHE = new Map<string, { rules: string; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REQUEST_TIMEOUT_MS = 8000;

function getOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

async function fetchRobotsTxt(origin: string): Promise<string> {
  const cached = ROBOTS_CACHE.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rules;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": "JobScanner/1.0 (compliance; +https://github.com/job-scanner)" },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const text = res.ok ? await res.text() : "";
    ROBOTS_CACHE.set(origin, { rules: text, fetchedAt: Date.now() });
    return text;
  } catch {
    ROBOTS_CACHE.set(origin, { rules: "", fetchedAt: Date.now() });
    return "";
  }
}

/**
 * Simple robots.txt check: if any "Disallow: /" appears for User-agent: *,
 * we consider the path disallowed unless there is an explicit Allow.
 * This is a conservative implementation; for production use a full parser (e.g. robots-txt-parser).
 */
function isDisallowed(rules: string, path: string): boolean {
  const lines = rules.split(/\r?\n/);
  let currentAgent = "";
  let disallowAll = false;
  const pathUrl = path.startsWith("/") ? path : new URL(path).pathname;
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith("user-agent:")) {
      currentAgent = trimmed.slice(11).trim();
      continue;
    }
    if (trimmed.startsWith("disallow:")) {
      const value = line.slice(9).trim();
      if (currentAgent === "*" && (value === "/" || value === "")) disallowAll = true;
      if (currentAgent === "*" && value && pathUrl.startsWith(value)) return true;
    }
    if (trimmed.startsWith("allow:") && currentAgent === "*") {
      const value = line.slice(6).trim();
      if (value && pathUrl.startsWith(value)) return false;
    }
  }
  return disallowAll;
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  const origin = getOrigin(url);
  if (!origin) return false;
  const rules = await fetchRobotsTxt(origin);
  return !isDisallowed(rules, url);
}
