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

/**
 * Supabase JWT payload structure
 * Used for validating tokens from frontend-v1 Supabase auth
 */
export interface SupabaseJwtPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string; // Supabase User ID (UUID)
  email: string;
  phone: string;
  role: string; // "authenticated" | "anon"
  app_metadata: {
    provider?: string;
    providers?: string[];
  };
  user_metadata: Record<string, any>;
  session_id: string;
}

export * from './ai.interfaces';
export * from './apify.interfaces';
export * from './enricher.interfaces';
export * from './linkedin.interfaces';
export * from './module-inputs.interface';
