import { describe, test, expect } from "bun:test";
import { filter } from "../src/pipeline.js";
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
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    techTags: [],
    descriptionText: "",
    applyUrl: "https://example.com",
    postedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
    raw: {},
    ...overrides,
  };
}

describe("filter allowMissingSalary", () => {
  test("when minSalary set and allowMissingSalary true, job without salary is kept", () => {
    const config = { ...DEFAULT_CONFIG, minSalary: 80000, allowMissingSalary: true };
    const j = job({ salaryMin: null, salaryMax: null });
    const { kept, reasons } = filter([j], config);
    expect(kept).toHaveLength(1);
    expect(reasons.has(j.id)).toBe(false);
  });

  test("when minSalary set and allowMissingSalary false, job without salary is filtered out", () => {
    const config = { ...DEFAULT_CONFIG, minSalary: 80000, allowMissingSalary: false };
    const j = job({ salaryMin: null, salaryMax: null });
    const { kept, reasons } = filter([j], config);
    expect(kept).toHaveLength(0);
    expect(reasons.get(j.id)).toBe("missing_salary");
  });

  test("when minSalary set and job has salary >= min, job is kept", () => {
    const config = { ...DEFAULT_CONFIG, minSalary: 80000, allowMissingSalary: false };
    const j = job({ salaryMin: 100000, salaryMax: 150000 });
    const { kept } = filter([j], config);
    expect(kept).toHaveLength(1);
  });

  test("when minSalary set and job has salary < min, job is filtered", () => {
    const config = { ...DEFAULT_CONFIG, minSalary: 200000, allowMissingSalary: true };
    const j = job({ salaryMin: 100000, salaryMax: 150000 });
    const { kept, reasons } = filter([j], config);
    expect(kept).toHaveLength(0);
    expect(reasons.get(j.id)).toBe("salary_below_min");
  });
});
