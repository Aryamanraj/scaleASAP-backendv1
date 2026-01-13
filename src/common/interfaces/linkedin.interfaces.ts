/**
 * LinkedIn Connector Interfaces
 */

export interface LinkedinProfileConnectorInput {
  profileUrl: string;
  actorId?: string;
  actorInput?: any;
  limit?: number;
}

export interface LinkedinPostsConnectorInput {
  profileUrl: string;
  actorId?: string;
  actorInput?: any;
  limit?: number;
  totalPosts?: number;
}

export interface WriteLinkedinDocumentParams {
  projectId: number;
  personId: number;
  documentType: string;
  sourceRef: string;
  storageUri: string;
  payloadJson: any;
  moduleRunId: number;
  metaJson?: any;
}
