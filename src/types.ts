/**
 * Unified job schema - all sources normalize to this shape.
 */
export interface Job {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  company: string;
  companyDomain: string | null;
  location: string;
  isRemote: boolean;
  remoteRegion: string | null;
  employmentType: string | null;
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  techTags: string[];
  descriptionText: string;
  applyUrl: string;
  postedAt: string | null;
  scrapedAt: string;
  raw: unknown;
  score?: number;
}

/**
 * Raw payload from a source - shape varies per connector.
 */
export type RawJob = unknown;

export interface SourcesConfig {
  remoteok?: boolean;
  weworkremotely?: boolean;
  workingnomads?: boolean;
  nodesk?: boolean;
  builtin?: boolean;
  remoteineurope?: boolean;
  remoteco?: boolean;
  remoterocketship?: boolean;
  linkedin?: boolean;
  /** Third-party feeds that syndicate LinkedIn-posted jobs (RSS URLs). Use when linkedin is true. */
  linkedinFeeds?: { feeds: string[] };
  wellfound?: boolean;
  rss?: { feeds: string[] };
}

export interface ScoringWeights {
  keywordMatch?: number;
  tagMatch?: number;
  seniorityMatch?: number;
  salaryMatch?: number;
  excludePenalty?: number;
}

export interface Config {
  keywordsInclude: string[];
  keywordsExclude: string[];
  requiredTags: string[];
  excludedCompanies: string[];
  remoteOnly: boolean;
  allowedRegions: string[];
  minSalary: number | null;
  allowMissingSalary: boolean;
  seniorityAllowed: string[];
  employmentTypesAllowed: string[];
  postedWithinDays: number;
  scoringWeights: ScoringWeights;
  sortBy: "score" | "postedAt" | "salaryMax";
  sortOrder: "asc" | "desc";
  sources: SourcesConfig;
}

export type Format = "md" | "csv" | "both";

export const DEFAULT_CONFIG: Config = {
  keywordsInclude: [],
  keywordsExclude: [],
  requiredTags: [],
  excludedCompanies: [],
  remoteOnly: true,
  allowedRegions: ["Worldwide", "EU", "APAC", "Asia"],
  minSalary: null,
  allowMissingSalary: true,
  seniorityAllowed: ["Senior", "Staff", "Lead"],
  employmentTypesAllowed: [],
  postedWithinDays: 21,
  scoringWeights: {
    keywordMatch: 1,
    tagMatch: 2,
    seniorityMatch: 1,
    salaryMatch: 1,
    excludePenalty: -10,
  },
  sortBy: "score",
  sortOrder: "desc",
  sources: {
    remoteok: true,
    weworkremotely: true,
    workingnomads: true,
    nodesk: false,
    builtin: false,
    remoteineurope: false,
    remoteco: false,
    remoterocketship: false,
    linkedin: false,
    linkedinFeeds: { feeds: [] },
    wellfound: false,
    rss: { feeds: [] },
  },
};
