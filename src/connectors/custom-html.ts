/**
 * Phase 2: Custom HTML connector - only for sites that allow crawling.
 * Respects robots.txt; rate-limited and disabled by default in config.
 */

import type { IJobConnector } from "./types.js";
import { isAllowedByRobots } from "../lib/robots.js";
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface CustomHtmlSourceConfig {
  name: string;
  baseUrl: string;
  enabled?: boolean;
}

interface SiteProfile {
  jobPathHints: string[];
  blockedPathHints: string[];
  blockedTextHints: string[];
}

const DEFAULT_PROFILE: SiteProfile = {
  jobPathHints: ["job", "jobs", "career", "careers", "position", "opening", "openings"],
  blockedPathHints: [
    "about",
    "blog",
    "privacy",
    "terms",
    "login",
    "signin",
    "signup",
    "contact",
    "help",
    "support",
    "news",
    "article",
    "event",
    "company",
    "companies",
    "category",
    "tag",
  ],
  blockedTextHints: [
    "learn more",
    "read more",
    "view all",
    "see all",
    "cookie",
    "privacy",
    "terms",
    "log in",
    "sign in",
    "sign up",
    "subscribe",
    "newsletter",
  ],
};

const PROFILE_BY_SOURCE: Record<string, Partial<SiteProfile>> = {
  builtin: {
    jobPathHints: ["job", "jobs", "position", "career"],
    blockedPathHints: [...DEFAULT_PROFILE.blockedPathHints, "salaries", "courses", "advice"],
  },
  remoterocketship: {
    jobPathHints: ["job", "jobs"],
    blockedPathHints: [...DEFAULT_PROFILE.blockedPathHints, "talent", "post-a-job", "employers"],
  },
};

/**
 * Creates a custom HTML connector that fetches a single page and parses job links.
 * Does NOT fetch unless isAllowedByRobots(baseUrl) is true.
 * Keep disabled by default; enable only for sites that explicitly permit crawling.
 */
export function createCustomHtmlConnector(config: CustomHtmlSourceConfig): IJobConnector {
  const { name, baseUrl } = config;
  return {
    name,
    async fetch() {
      const allowed = await isAllowedByRobots(baseUrl);
      if (!allowed) return [];
      try {
        const res = await fetchWithTimeout(baseUrl, {
          "User-Agent": "JobScanner/1.0 (compliance; +https://github.com/job-scanner)",
        });
        if (!res.ok) return [];
        const html = await res.text();
        return parseJobLinksFromHtml(html, baseUrl, name);
      } catch {
        return [];
      }
    },
  };
}

function buildProfile(source: string): SiteProfile {
  const override = PROFILE_BY_SOURCE[source] ?? {};
  return {
    jobPathHints: override.jobPathHints ?? DEFAULT_PROFILE.jobPathHints,
    blockedPathHints: override.blockedPathHints ?? DEFAULT_PROFILE.blockedPathHints,
    blockedTextHints: override.blockedTextHints ?? DEFAULT_PROFILE.blockedTextHints,
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function isLikelyJobUrl(urlStr: string, baseUrl: string, profile: SiteProfile): boolean {
  let url: URL;
  let base: URL;
  try {
    url = new URL(urlStr);
    base = new URL(baseUrl);
  } catch {
    return false;
  }

  if (url.origin !== base.origin) return false;
  if (url.hash) return false;
  if (/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js)$/i.test(url.pathname)) return false;

  const path = url.pathname.toLowerCase();
  if (!profile.jobPathHints.some((hint) => path.includes(hint))) return false;
  if (profile.blockedPathHints.some((hint) => path.includes(hint))) return false;

  const segmentCount = path.split("/").filter(Boolean).length;
  if (segmentCount < 2 && !path.includes("job")) return false;
  return true;
}

function looksLikeJunkTitle(text: string, profile: SiteProfile): boolean {
  const t = text.toLowerCase();
  if (text.length < 8 || text.length > 140) return true;
  if (!/[a-z]/i.test(text)) return true;
  if (profile.blockedTextHints.some((hint) => t.includes(hint))) return true;
  if (/^(home|jobs|careers|menu|search|filters?)$/i.test(text)) return true;
  return false;
}

function extractCompany(title: string): string {
  const atMatch = title.match(/\s+at\s+(.+)$/i);
  if (!atMatch) return "";
  const company = normalizeText(atMatch[1]);
  if (company.length < 2 || company.length > 80) return "";
  return company;
}

function extractLocation(context: string): string {
  const t = normalizeText(context);
  const direct = t.match(/\b(remote(?:\s*-\s*\w+)?|worldwide|europe|eu|apac|asia|us only|united states)\b/i);
  if (direct) return normalizeText(direct[1]);
  const withPrefix = t.match(/\b(location|region)\s*[:\-]\s*([a-z0-9 ,\-()/]{2,80})/i);
  if (withPrefix) return normalizeText(withPrefix[2]);
  return "";
}

function extractJsonLdJobs(html: string, baseUrl: string): Record<string, unknown>[] {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: Record<string, unknown>[] = [];
  let m: RegExpExecArray | null;

  while ((m = scriptRegex.exec(html)) !== null) {
    const rawJson = m[1].trim();
    if (!rawJson) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && Array.isArray((parsed as Record<string, unknown>)["@graph"])
        ? ((parsed as Record<string, unknown>)["@graph"] as unknown[])
        : [parsed];

    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const rec = node as Record<string, unknown>;
      const type = String(rec["@type"] ?? "").toLowerCase();
      if (!type.includes("jobposting")) continue;

      const title = normalizeText(String(rec.title ?? ""));
      const url = normalizeText(String(rec.url ?? ""));
      const description = normalizeText(stripTags(String(rec.description ?? "")));
      const postedAt = rec.datePosted ? new Date(String(rec.datePosted)).toISOString() : null;

      const org = rec.hiringOrganization as Record<string, unknown> | undefined;
      const company = org?.name ? normalizeText(String(org.name)) : "";

      let location = "";
      const locationNode = rec.jobLocation as Record<string, unknown> | Record<string, unknown>[] | undefined;
      if (Array.isArray(locationNode) && locationNode[0]) {
        const address = (locationNode[0].address as Record<string, unknown> | undefined) ?? {};
        location = normalizeText(String(address.addressLocality ?? address.addressRegion ?? address.addressCountry ?? ""));
      } else if (locationNode && typeof locationNode === "object") {
        const address = ((locationNode as Record<string, unknown>).address as Record<string, unknown> | undefined) ?? {};
        location = normalizeText(String(address.addressLocality ?? address.addressRegion ?? address.addressCountry ?? ""));
      }
      if (!location && String(rec.jobLocationType ?? "").toUpperCase() === "TELECOMMUTE") {
        location = "Remote";
      }

      const resolved = resolveUrl(url, baseUrl);
      if (!title || !resolved) continue;

      out.push({
        source: "custom-html",
        title,
        company,
        location,
        description,
        link: resolved,
        postedAt,
        raw: rec,
      });
    }
  }

  return out;
}

export function parseJobLinksFromHtml(html: string, baseUrl: string, sourceName = "custom-html"): Record<string, unknown>[] {
  const profile = buildProfile(sourceName);
  const items: Record<string, unknown>[] = [];
  const jsonLdItems = extractJsonLdJobs(html, baseUrl);
  const seen = new Set<string>();

  for (const item of jsonLdItems) {
    const link = String(item.link ?? "").trim();
    if (!link || seen.has(link)) continue;
    seen.add(link);
    items.push(item);
  }

  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const hrefRaw = m[1].trim();
    const href = resolveUrl(hrefRaw, baseUrl);
    if (!href || !isLikelyJobUrl(href, baseUrl, profile) || seen.has(href)) continue;

    const anchorText = normalizeText(stripTags(m[2]));
    if (!anchorText || looksLikeJunkTitle(anchorText, profile)) continue;

    const contextStart = Math.max(0, m.index - 240);
    const contextEnd = Math.min(html.length, m.index + m[0].length + 240);
    const context = normalizeText(stripTags(html.slice(contextStart, contextEnd)));

    const company = extractCompany(anchorText);
    const location = extractLocation(context);

    seen.add(href);
    items.push({
      source: "custom-html",
      title: anchorText,
      company,
      location,
      description: "",
      link: href,
      postedAt: null,
      raw: { href, text: anchorText },
    });
  }
  return items;
}
