export default () => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT),
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: process.env.POSTGRES_DB,
    DB_SYNC: process.env.DB_SYNC, // Set to 'true' to enable TypeORM synchronize (development only!)
    PORT: parseInt(process.env.PORT) || 3001,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
    APIFY_TOKEN: process.env.APIFY_TOKEN,
    // AI Provider Configuration
    ai: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      },
    },
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // Supabase configuration for frontend-v1 auth integration
    supabase: {
      jwtSecret: process.env.SUPABASE_JWT_SECRET,
      url: process.env.SUPABASE_URL,
    },
  };
};
