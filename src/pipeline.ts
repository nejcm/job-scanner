import { randomUUID } from "crypto";
import type { Config, Job } from "./types.js";

const SCRAPED_AT = new Date().toISOString();

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeRemoteOk(raw: Record<string, unknown>): Job {
  const id = String(raw.id ?? randomUUID());
  const title = String(raw.position ?? "").trim();
  const company = String(raw.company ?? "").trim();
  const location = String(raw.location ?? "").trim();
  const desc = typeof raw.description === "string" ? stripHtml(raw.description) : "";
  const applyUrl = String(raw.url ?? raw.apply_url ?? "").trim();
  const epoch = typeof raw.epoch === "number" ? raw.epoch : null;
  const postedAt = epoch ? new Date(epoch * 1000).toISOString() : null;
  const salaryMin = typeof raw.salary_min === "number" ? raw.salary_min : null;
  const salaryMax = typeof raw.salary_max === "number" ? raw.salary_max : null;
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : [];
  const isRemote = !location.toLowerCase().includes("on-site") || tags.some((t: string) => /remote|worldwide|anywhere/i.test(t));
  return {
    id: randomUUID(),
    source: "remoteok",
    sourceId: id,
    title,
    company,
    companyDomain: null,
    location,
    isRemote: isRemote ?? true,
    remoteRegion: location || "Worldwide",
    employmentType: null,
    seniority: null,
    salaryMin,
    salaryMax,
    salaryCurrency: typeof raw.salary_currency === "string" ? raw.salary_currency : null,
    salaryPeriod: null,
    techTags: tags,
    descriptionText: desc,
    applyUrl: applyUrl || `https://remoteok.com/l/${id}`,
    postedAt,
    scrapedAt: SCRAPED_AT,
    raw,
  };
}

export function normalizeWorkingNomads(raw: Record<string, unknown>): Job {
  const title = String(raw.title ?? "").trim();
  const company = String(raw.company_name ?? "").trim();
  const location = String(raw.location ?? "").trim();
  const desc = typeof raw.description === "string" ? stripHtml(raw.description) : "";
  const applyUrl = String(raw.url ?? "").trim();
  const postedAt = raw.published_at ? new Date(String(raw.published_at)).toISOString() : null;
  const categories = Array.isArray(raw.categories) ? raw.categories.map(String) : [];
  return {
    id: randomUUID(),
    source: "workingnomads",
    sourceId: String(raw.id ?? randomUUID()),
    title,
    company,
    companyDomain: null,
    location,
    isRemote: true,
    remoteRegion: location || "Worldwide",
    employmentType: null,
    seniority: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    techTags: categories,
    descriptionText: desc,
    applyUrl,
    postedAt,
    scrapedAt: SCRAPED_AT,
    raw,
  };
}

export function normalizeRss(raw: Record<string, unknown>, source: string): Job {
  const title = String(raw.title ?? "").trim();
  const link = String(raw.link ?? raw.applyUrl ?? "").trim();
  const desc = typeof raw.description === "string" ? stripHtml(raw.description) : "";
  const dateRaw = raw.pubDate ?? raw.postedAt;
  const pubDate = dateRaw ? new Date(String(dateRaw)).toISOString() : null;
  const company = String(raw.company ?? "").trim();
  const location = String(raw.location ?? "").trim();
  const region = location || "Worldwide";
  return {
    id: randomUUID(),
    source,
    sourceId: link || randomUUID(),
    title,
    company,
    companyDomain: null,
    location,
    isRemote: true,
    remoteRegion: region,
    employmentType: null,
    seniority: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    techTags: [],
    descriptionText: desc,
    applyUrl: link,
    postedAt: pubDate,
    scrapedAt: SCRAPED_AT,
    raw,
  };
}

const SENIORITY_PATTERN = /(intern|junior|mid|senior|staff|lead|principal)/i;
function inferSeniority(title: string): string | null {
  const m = title.match(SENIORITY_PATTERN);
  if (!m) return null;
  const s = m[1].toLowerCase();
  if (s === "intern") return "Intern";
  if (s === "junior") return "Junior";
  if (s === "mid") return "Mid";
  if (s === "senior") return "Senior";
  if (s === "staff") return "Staff";
  if (s === "lead") return "Lead";
  if (s === "principal") return "Principal";
  return null;
}

const REMOTE_PATTERN = /remote|worldwide|anywhere|distributed|work from home|wfh/i;
function inferRemote(job: Job): { isRemote: boolean; region: string | null } {
  const text = `${job.location} ${job.descriptionText}`.toLowerCase();
  if (REMOTE_PATTERN.test(text)) return { isRemote: true, region: job.remoteRegion || "Worldwide" };
  if (job.location.toLowerCase().includes("remote")) return { isRemote: true, region: "Worldwide" };
  return { isRemote: job.isRemote, region: job.remoteRegion };
}

const TECH_TAGS = ["react", "next.js", "node", "node.js", "typescript", "javascript", "python", "go", "rust", "java", "fullstack", "frontend", "backend", "devops", "aws", "graphql", "postgres", "mongodb"];
function extractTechTags(title: string, description: string): string[] {
  const combined = `${title} ${description}`.toLowerCase();
  const found = new Set<string>();
  for (const tag of TECH_TAGS) {
    if (combined.includes(tag)) found.add(tag);
  }
  return [...found];
}

export function enrich(job: Job): Job {
  const seniority = job.seniority ?? inferSeniority(job.title);
  const { isRemote, region } = inferRemote(job);
  const techTags = job.techTags.length ? job.techTags : extractTechTags(job.title, job.descriptionText);
  return { ...job, seniority, isRemote, remoteRegion: region, techTags };
}

function exactKey(job: Job): string {
  const u = job.applyUrl?.trim().toLowerCase() || "";
  if (u) return `url:${u}`;
  return `key:${[job.company, job.title, job.location].map((s) => (s ?? "").toLowerCase().trim()).join("|")}`;
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  let matches = 0;
  const longer = sa.length > sb.length ? sa : sb;
  const shorter = sa.length > sb.length ? sb : sa;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return (2 * matches) / (longer.length + shorter.length);
}

export function dedupe(jobs: Job[]): Job[] {
  const byKey = new Map<string, Job>();
  for (const job of jobs) {
    const key = exactKey(job);
    if (!byKey.has(key)) byKey.set(key, job);
  }
  const list = [...byKey.values()];
  const out: Job[] = [];
  const THRESHOLD = 0.85;
  for (const job of list) {
    let duplicate = false;
    for (const other of out) {
      const titleSim = similarity(job.title, other.title);
      const companySim = similarity(job.company, other.company);
      if (titleSim >= THRESHOLD && companySim >= THRESHOLD) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) out.push(job);
  }
  return out;
}

export type FilterReason = string;

export function filter(jobs: Job[], config: Config): { kept: Job[]; reasons: Map<string, FilterReason> } {
  const reasons = new Map<string, FilterReason>();
  const kept: Job[] = [];

  const includeKw = config.keywordsInclude.map((k) => k.toLowerCase());
  const excludeKw = config.keywordsExclude.map((k) => k.toLowerCase());
  const requiredTags = config.requiredTags.map((t) => t.toLowerCase());
  const excludedCompanies = config.excludedCompanies.map((c) => c.toLowerCase());
  const allowedRegions = new Set(config.allowedRegions.map((r) => r.toLowerCase()));
  const seniorityAllowed = new Set(config.seniorityAllowed.map((s) => s.toLowerCase()));
  const employmentAllowed = config.employmentTypesAllowed.length ? new Set(config.employmentTypesAllowed.map((e) => e.toLowerCase())) : null;
  const postedWithinDays = config.postedWithinDays;
  const now = Date.now();
  const minTs = postedWithinDays > 0 ? now - postedWithinDays * 24 * 60 * 60 * 1000 : 0;

  for (const job of jobs) {
    const jobId = job.id;

    if (config.excludedCompanies.length && job.company) {
      const companyLower = job.company.toLowerCase();
      if (excludedCompanies.some((c) => companyLower.includes(c) || c.includes(companyLower))) {
        reasons.set(jobId, "excluded_company");
        continue;
      }
    }

    if (config.remoteOnly && !job.isRemote) {
      reasons.set(jobId, "not_remote");
      continue;
    }

    if (config.allowedRegions.length && job.remoteRegion) {
      const regionLower = job.remoteRegion.toLowerCase();
      const allowed = [...allowedRegions].some((r) => regionLower.includes(r) || r.includes(regionLower));
      if (!allowed) {
        reasons.set(jobId, "region_not_allowed");
        continue;
      }
    }

    const text = `${job.title} ${job.descriptionText}`.toLowerCase();
    if (includeKw.length && !includeKw.some((k) => text.includes(k))) {
      reasons.set(jobId, "missing_keyword");
      continue;
    }
    if (excludeKw.length && excludeKw.some((k) => text.includes(k))) {
      reasons.set(jobId, "excluded_keyword");
      continue;
    }

    if (requiredTags.length && job.techTags.length) {
      const jobTags = new Set(job.techTags.map((t) => t.toLowerCase()));
      if (!requiredTags.some((t) => jobTags.has(t))) {
        reasons.set(jobId, "missing_tag");
        continue;
      }
    } else if (requiredTags.length) {
      reasons.set(jobId, "missing_tag");
      continue;
    }

    if (config.seniorityAllowed.length && job.seniority) {
      const s = job.seniority.toLowerCase();
      if (!seniorityAllowed.has(s)) {
        reasons.set(jobId, "seniority");
        continue;
      }
    }

    if (employmentAllowed && job.employmentType) {
      const e = job.employmentType.toLowerCase();
      if (!employmentAllowed.has(e)) {
        reasons.set(jobId, "employment_type");
        continue;
      }
    }

    if (postedWithinDays > 0 && job.postedAt) {
      const t = new Date(job.postedAt).getTime();
      if (t < minTs) {
        reasons.set(jobId, "posted_too_old");
        continue;
      }
    }

    if (config.minSalary != null && config.minSalary > 0) {
      const hasSalary = job.salaryMin != null || job.salaryMax != null;
      if (hasSalary) {
        const effective = job.salaryMax ?? job.salaryMin ?? 0;
        if (effective < config.minSalary) {
          reasons.set(jobId, "salary_below_min");
          continue;
        }
      } else {
        if (!config.allowMissingSalary) {
          reasons.set(jobId, "missing_salary");
          continue;
        }
      }
    }

    kept.push(job);
  }

  return { kept, reasons };
}

export function score(jobs: Job[], config: Config): Job[] {
  const w = config.scoringWeights;
  const includeKw = config.keywordsInclude.map((k) => k.toLowerCase());
  const excludeKw = config.keywordsExclude.map((k) => k.toLowerCase());
  const senioritySet = new Set(config.seniorityAllowed.map((s) => s.toLowerCase()));

  return jobs.map((job) => {
    let s = 0;
    const text = `${job.title} ${job.descriptionText}`.toLowerCase();
    if (includeKw.length && includeKw.some((k) => text.includes(k))) s += w.keywordMatch ?? 0;
    if (excludeKw.some((k) => text.includes(k))) s += w.excludePenalty ?? 0;
    if (job.techTags.length && config.requiredTags.length) {
      const jobTags = new Set(job.techTags.map((t) => t.toLowerCase()));
      if (config.requiredTags.some((t) => jobTags.has(t.toLowerCase()))) s += w.tagMatch ?? 0;
    }
    if (job.seniority && senioritySet.has(job.seniority.toLowerCase())) s += w.seniorityMatch ?? 0;
    if (config.minSalary != null && (job.salaryMin != null || job.salaryMax != null)) {
      const effective = job.salaryMax ?? job.salaryMin ?? 0;
      if (effective >= config.minSalary) s += w.salaryMatch ?? 0;
    }
    return { ...job, score: s };
  });
}

export function sort(jobs: Job[], config: Config): Job[] {
  const order = config.sortOrder === "asc" ? 1 : -1;
  const key = config.sortBy;
  return [...jobs].sort((a, b) => {
    if (key === "score") return order * ((a.score ?? 0) - (b.score ?? 0));
    if (key === "postedAt") {
      const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return order * (ta - tb);
    }
    if (key === "salaryMax") return order * ((a.salaryMax ?? 0) - (b.salaryMax ?? 0));
    return 0;
  });
}

export function runPipeline(
  rawBySource: { source: string; raw: unknown[] }[],
  config: Config
): { jobs: Job[]; filterReasons: Map<string, FilterReason>; afterDedupe: number } {
  const all: Job[] = [];
  for (const { source, raw } of rawBySource) {
    for (const r of raw) {
      const rec = r as Record<string, unknown>;
      if (source === "remoteok") all.push(normalizeRemoteOk(rec));
      else if (source === "workingnomads") all.push(normalizeWorkingNomads(rec));
      else all.push(normalizeRss(rec, source));
    }
  }
  let jobs = all.map(enrich);
  jobs = dedupe(jobs);
  const afterDedupe = jobs.length;
  const { kept, reasons } = filter(jobs, config);
  jobs = score(kept, config);
  jobs = sort(jobs, config);
  return { jobs, filterReasons: reasons, afterDedupe };
}
