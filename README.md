# Job Scanner

Aggregate job postings from multiple sources, normalize them into a unified schema, filter and score by your criteria, and export to Markdown or CSV. Single CLI command, Bun-based.

## Setup

- **Runtime**: [Bun](https://bun.sh/) (Node 18+ compatible).
- Install: `bun install`
- Optional: copy `config.example.yaml` to `config.yaml` and edit (keywords, sources, filters).

## Usage

```bash
bun run job-scanner
bun run job-scanner --config config.yaml
bun run job-scanner --format csv
bun run job-scanner --format md   # writes Markdown report
```

Behavior: fetch from enabled sources → normalize → enrich → dedupe → filter → score → sort → write `./out/jobs-YYYY-MM-DD.md` and/or `./out/jobs-YYYY-MM-DD.csv` → print summary (counts per source, after dedupe/filter, top filter reasons).

## Config

- **allowMissingSalary** (default: `true`): When `minSalary` is set, jobs without salary are still kept if `allowMissingSalary: true`. Set to `false` for strict mode (filter out jobs with no salary).
- **minSalary**: Optional minimum salary threshold; only applies when set. Jobs with salary below are filtered; jobs without salary are kept or dropped according to `allowMissingSalary`.
- **sources**: Enable/disable providers:
  - API/RSS: `remoteok`, `weworkremotely`, `workingnomads`, `rss.feeds`
  - robots-gated HTML: `nodesk`, `builtin`, `remoteineurope`, `remoteco`, `remoterocketship`
  - restricted-by-default: `linkedin`, `wellfound` (currently skipped with warnings)

See `config.example.yaml` for full options (keywords, regions, seniority, scoring weights, sort order).

## Sources (feasibility and compliance)

- **Phase 1 (included)**
  - **RemoteOK**: Public API (`https://remoteok.com/api`).
  - **We Work Remotely**: Public RSS (`https://weworkremotely.com/remote-jobs.rss`).
  - **Working Nomads**: Public JSON (`https://www.workingnomads.com/api/exposed_jobs`).
  - **Generic RSS**: Any job RSS URLs listed under `sources.rss.feeds` in config.

- **Phase 2 (custom HTML)**  
  A framework exists for robots.txt–compliant custom HTML connectors (`src/lib/robots.ts`, `src/connectors/custom-html.ts`).
  Supported via this framework: NoDesk, BuiltIn, RemoteInEurope, Remote.co, RemoteRocketship.
  Use only for sites that explicitly allow crawling and comply with their terms and robots.txt.

- **Excluded by default**
  - **LinkedIn Jobs**: No public jobs API for general use; automation is restricted without approval.
  - **Wellfound**: No stable public jobs API; policy risk.

Comply with each platform’s terms of service and robots.txt. Prefer official APIs and RSS; use HTML only where permitted.

## Tests

```bash
bun test
```

Covers scoring (including missing-salary behavior), dedupe (exact and fuzzy), filter (`allowMissingSalary` and min salary), and RemoteOK normalization.

## License

Use at your own risk. Respect each source’s ToS and robots.txt.
