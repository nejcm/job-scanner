import type { RawJob } from "../types.js";

export interface IJobConnector {
  name: string;
  fetch(): Promise<RawJob[]>;
}
