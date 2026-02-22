import { describe, test, expect } from "bun:test";
import { score } from "../src/pipeline.js";
import type { Job } from "../src/types.js";
import { DEFAULT_CONFIG } from "../src/types.js";

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "1",
    source: "test",
    sourceId: "1",
    title: "Senior Engineer",
    company: "Acme",
    companyDomain: null,
    location: "Remote",
    isRemote: true,
    remoteRegion: "Worldwide",
    employmentType: null,
    seniority: "Senior",
    salaryMin: 100000,
    salaryMax: 150000,
    salaryCurrency: "USD",
    salaryPeriod: "year",
    techTags: ["react", "node"],
    descriptionText: "Fullstack role with react and node",
    applyUrl: "https://example.com/apply",
    postedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    raw: {},
    ...overrides,
  };
}

describe("scoring", () => {
  test("adds score for keyword match", () => {
    const config = { ...DEFAULT_CONFIG, keywordsInclude: ["react"] };
    const result = score([job()], config);
    expect(result[0].score).toBeGreaterThan(0);
  });

  test("missing salary contributes 0 (neutral)", () => {
    const config = { ...DEFAULT_CONFIG, minSalary: 80000 };
    const noSalary = job({ salaryMin: null, salaryMax: null });
    const withSalary = job({ salaryMin: 100000, salaryMax: 150000 });
    const result = score([noSalary, withSalary], config);
    expect(result[0].score).toBeDefined();
    expect(result[1].score).toBeDefined();
    expect(result[1].score).toBeGreaterThanOrEqual(result[0].score ?? 0);
  });

  test("exclude penalty applied for excluded keyword", () => {
    const config = { ...DEFAULT_CONFIG, keywordsExclude: ["wordpress"] };
    const j = job({ descriptionText: "We use wordpress" });
    const result = score([j], config);
    expect(result[0].score).toBeLessThan(0);
  });
});
