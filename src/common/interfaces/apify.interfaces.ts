/**
 * Apify API Interfaces
 */

export interface ApifyActorRun {
  id: string;
  actId: string;
  status: string;
  defaultDatasetId: string;
  startedAt?: string;
  finishedAt?: string;
}

export type ApifyDatasetItem = any;

export interface ApifyRunResult {
  run: ApifyActorRun;
  items: ApifyDatasetItem[];
}
