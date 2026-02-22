import { readFileSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import type { Config } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

function parseConfigObject(raw: Record<string, unknown>): Config {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  const num = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);
  const weights = raw.scoringWeights as Record<string, number> | undefined;
  const sources = (raw.sources as Record<string, unknown>) ?? {};
  const rss = sources.rss as Record<string, unknown> | undefined;
  const linkedinFeeds = sources.linkedinFeeds as Record<string, unknown> | undefined;
  const def = DEFAULT_CONFIG;
  return {
    keywordsInclude: raw.keywordsInclude != null ? arr(raw.keywordsInclude) : def.keywordsInclude,
    keywordsExclude: raw.keywordsExclude != null ? arr(raw.keywordsExclude) : def.keywordsExclude,
    requiredTags: raw.requiredTags != null ? arr(raw.requiredTags) : def.requiredTags,
    excludedCompanies: raw.excludedCompanies != null ? arr(raw.excludedCompanies) : def.excludedCompanies,
    remoteOnly: raw.remoteOnly !== undefined ? raw.remoteOnly === true : def.remoteOnly,
    allowedRegions: raw.allowedRegions != null ? arr(raw.allowedRegions) : def.allowedRegions,
    minSalary: raw.minSalary !== undefined ? num(raw.minSalary) : def.minSalary,
    allowMissingSalary: raw.allowMissingSalary !== false,
    seniorityAllowed: raw.seniorityAllowed != null ? arr(raw.seniorityAllowed) : def.seniorityAllowed,
    employmentTypesAllowed: raw.employmentTypesAllowed != null ? arr(raw.employmentTypesAllowed) : def.employmentTypesAllowed,
    postedWithinDays: typeof raw.postedWithinDays === "number" ? raw.postedWithinDays : def.postedWithinDays,
    scoringWeights: {
      keywordMatch: weights?.keywordMatch ?? def.scoringWeights.keywordMatch ?? 1,
      tagMatch: weights?.tagMatch ?? def.scoringWeights.tagMatch ?? 2,
      seniorityMatch: weights?.seniorityMatch ?? def.scoringWeights.seniorityMatch ?? 1,
      salaryMatch: weights?.salaryMatch ?? def.scoringWeights.salaryMatch ?? 1,
      excludePenalty: weights?.excludePenalty ?? def.scoringWeights.excludePenalty ?? -10,
    },
    sortBy: raw.sortBy === "postedAt" || raw.sortBy === "salaryMax" ? raw.sortBy : def.sortBy,
    sortOrder: raw.sortOrder === "asc" ? "asc" : def.sortOrder,
    sources: {
      remoteok: sources.remoteok === true,
      weworkremotely: sources.weworkremotely === true,
      workingnomads: sources.workingnomads === true,
      nodesk: sources.nodesk === true,
      builtin: sources.builtin === true,
      remoteineurope: sources.remoteineurope === true,
      remoteco: sources.remoteco === true,
      remoterocketship: sources.remoterocketship === true,
      linkedin: sources.linkedin === true,
      linkedinFeeds: {
        feeds: linkedinFeeds?.feeds != null ? arr(linkedinFeeds.feeds) : def.sources.linkedinFeeds?.feeds ?? [],
      },
      wellfound: sources.wellfound === true,
      rss: { feeds: rss?.feeds != null ? arr(rss.feeds) : def.sources.rss?.feeds ?? [] },
    },
  };
}

export function loadConfig(configPath: string | undefined): Config {
  const path = resolve(configPath ?? "config.yaml");
  try {
    const content = readFileSync(path, "utf-8");
    const raw = parseYaml(content) as Record<string, unknown>;
    return parseConfigObject(raw ?? {});
  } catch {
    return DEFAULT_CONFIG;
  }
}
