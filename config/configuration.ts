export default () => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT),
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: process.env.POSTGRES_DB,
    PORT: parseInt(process.env.PORT) || 3001,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
    APIFY_TOKEN: process.env.APIFY_TOKEN,
  };
};
