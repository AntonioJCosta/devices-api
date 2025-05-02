import { config } from "dotenv";
import { z } from "zod";
 
const NODE_ENV = process.env.NODE_ENV || "local";
 
const envFile = `./.env.${NODE_ENV}`;
config({ path: envFile });
 
const envSchema = z.object({
    DATABASE_URL: z.string().url(),
});
 
const env = envSchema.parse(process.env);
 
export { env, NODE_ENV };