import { DATA_SOURCE } from '../types/posts.types';

export interface NormalizedPostInput {
  projectId: number;
  personId: number;
  sourceDocumentId: number;
  documentJson: any;
  source?: DATA_SOURCE;
}

export interface NormalizedPostResult {
  created: number;
  skipped: number;
}
