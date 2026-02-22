import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { FilterReason } from "./pipeline.js";
import type { Format, Job } from "./types.js";

const OUT_DIR = "out";

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function stringifyValue(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value, null, 2);
}

function jobsToMarkdown(jobs: Job[]): string {
  const lines: string[] = [];
  lines.push("# Job Scanner Results");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total jobs: ${jobs.length}`);
  lines.push("");

  const orderedKeys: (keyof Job | "score")[] = [
    "id",
    "source",
    "sourceId",
    "title",
    "company",
    "companyDomain",
    "location",
    "isRemote",
    "remoteRegion",
    "employmentType",
    "seniority",
    "salaryMin",
    "salaryMax",
    "salaryCurrency",
    "salaryPeriod",
    "techTags",
    "descriptionText",
    "applyUrl",
    "postedAt",
    "scrapedAt",
    "score",
    "raw",
  ];

  jobs.forEach((job, idx) => {
    lines.push(`## ${idx + 1}. ${job.title || "(untitled role)"}`);
    lines.push("");
    lines.push("| Property | Value |");
    lines.push("| --- | --- |");
    for (const key of orderedKeys) {
      const value = stringifyValue(job[key]);
      lines.push(`| ${key} | ${mdEscape(value).replace(/\n/g, "<br/>")} |`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

export async function writeOutput(
  jobs: Job[],
  format: Format,
  filterReasons: Map<string, FilterReason>,
  counts: {
    fetched: number;
    bySource: Record<string, number>;
    afterDedupe: number;
    afterFilter: number;
  },
): Promise<string> {
  await mkdir(OUT_DIR, { recursive: true });
  const summaryLines: string[] = [];
  const stamp = dateStamp();

  if (format === "md" || format === "both") {
    const path = join(OUT_DIR, `jobs-${stamp}.md`);
    await writeFile(path, jobsToMarkdown(jobs), "utf-8");
    summaryLines.push(`Written ${jobs.length} jobs to ${path}`);
  }
  if (format === "csv" || format === "both") {
    const path = join(OUT_DIR, `jobs-${stamp}.csv`);
    const headers = [
      "id",
      "source",
      "sourceId",
      "title",
      "company",
      "location",
      "isRemote",
      "applyUrl",
      "postedAt",
      "score",
    ];
    const rows = jobs.map((j) =>
      headers
        .map((h) => {
          const v = j[h as keyof Job];
          return escapeCsv(v != null ? String(v) : "");
        })
        .join(","),
    );
    await writeFile(path, [headers.join(","), ...rows].join("\n"), "utf-8");
    summaryLines.push(`Written ${jobs.length} jobs to ${path}`);
  }

  summaryLines.push("");
  summaryLines.push(
    `Fetched ${counts.fetched} total (${Object.entries(counts.bySource)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")}).`,
  );
  summaryLines.push(
    `After dedupe: ${counts.afterDedupe}. After filter: ${counts.afterFilter}.`,
  );
  if (filterReasons.size > 0) {
    const byReason: Record<string, number> = {};
    for (const r of filterReasons.values()) {
      byReason[r] = (byReason[r] ?? 0) + 1;
    }
    const top = Object.entries(byReason)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    summaryLines.push(
      `Top filter reasons: ${top.map(([r, n]) => `${r}: ${n}`).join(", ")}.`,
    );
  }

  return summaryLines.join("\n");
}
