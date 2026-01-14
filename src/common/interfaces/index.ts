export interface ResultWithError {
  error: any;
  data: any;
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = Array<JSONValue>;

export interface JwtPayload {
  userId: number;
}

export * from './ai.interfaces';
export * from './apify.interfaces';
export * from './enricher.interfaces';
export * from './linkedin.interfaces';
export * from './module-inputs.interface';
