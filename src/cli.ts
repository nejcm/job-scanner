#!/usr/bin/env bun
import { loadConfig } from "./config.js";
import { getConnectors } from "./connectors/index.js";
import { fetchAll } from "./fetch.js";
import { writeOutput } from "./output.js";
import { runPipeline } from "./pipeline.js";
import { Format } from "./types.js";

function parseArgs(): { config?: string; format: Format } {
  const args = process.argv.slice(2);
  let config: string | undefined;
  let format: Format = "both";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      config = args[++i];
    } else if (args[i] === "--format" && args[i + 1]) {
      const f = args[++i].toLowerCase();
      if (f === "md" || f === "csv") format = f;
    }
  }
  return { config, format };
}

async function main(): Promise<void> {
  const { config: configPath, format } = parseArgs();
  const config = loadConfig(configPath);
  const connectors = getConnectors(config);
  if (connectors.length === 0) {
    console.log("No sources enabled. Configure sources in config.yaml.");
    process.exit(0);
  }

  const rawBySource = await fetchAll(connectors);
  const totalFetched = rawBySource.reduce((s, r) => s + r.raw.length, 0);
  const bySource: Record<string, number> = {};
  for (const { source, raw } of rawBySource) {
    bySource[source] = (bySource[source] ?? 0) + raw.length;
  }

  const { jobs, filterReasons, afterDedupe } = runPipeline(rawBySource, config);

  const summary = await writeOutput(jobs, format, filterReasons, {
    fetched: totalFetched,
    bySource,
    afterDedupe,
    afterFilter: jobs.length,
  });
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
