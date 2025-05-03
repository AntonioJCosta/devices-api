import { defineConfig } from "drizzle-kit";
import { DB_URL } from './src/config/env';

export default defineConfig({
  schema: './drizzle/schema.ts', 
  out: './drizzle/migrations',
  dialect: 'postgresql', 
  dbCredentials: {
    url: DB_URL,
  },
  verbose: true,
  strict: true, 
});