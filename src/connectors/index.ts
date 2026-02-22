import type { Config } from "../types.js";
import { remoteokConnector } from "./remoteok.js";
import { weworkremotelyConnector } from "./weworkremotely.js";
import { workingnomadsConnector } from "./workingnomads.js";
import { createRssConnector } from "./rss.js";
import { createCustomHtmlConnector } from "./custom-html.js";
import type { IJobConnector } from "./types.js";

export function getConnectors(config: Config): IJobConnector[] {
  const list: IJobConnector[] = [];
  if (config.sources.remoteok) list.push(remoteokConnector);
  if (config.sources.weworkremotely) list.push(weworkremotelyConnector);
  if (config.sources.workingnomads) list.push(workingnomadsConnector);
  if (config.sources.nodesk) {
    list.push(
      createCustomHtmlConnector({
        name: "nodesk",
        baseUrl: "https://nodesk.co/remote-jobs/",
      })
    );
  }
  if (config.sources.builtin) {
    list.push(
      createCustomHtmlConnector({
        name: "builtin",
        baseUrl: "https://builtin.com/jobs",
      })
    );
  }
  if (config.sources.remoteineurope) {
    list.push(
      createCustomHtmlConnector({
        name: "remoteineurope",
        baseUrl: "https://remoteineurope.com/",
      })
    );
  }
  if (config.sources.remoteco) {
    list.push(
      createCustomHtmlConnector({
        name: "remoteco",
        baseUrl: "https://remote.co/",
      })
    );
  }
  if (config.sources.remoterocketship) {
    list.push(
      createCustomHtmlConnector({
        name: "remoterocketship",
        baseUrl: "https://www.remoterocketship.com/?page=1&sort=DateAdded",
      })
    );
  }
  if (config.sources.linkedin) {
    console.warn("Skipping linkedin: no public jobs API + automation restrictions.");
  }
  if (config.sources.wellfound) {
    console.warn("Skipping wellfound: no stable unrestricted public jobs API.");
  }
  const feeds = config.sources.rss?.feeds;
  if (feeds?.length) list.push(createRssConnector(feeds));
  return list;
}

export type { IJobConnector } from "./types.js";
