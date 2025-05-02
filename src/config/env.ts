import { config } from "dotenv";
import { z } from "zod";

/**
 * Determines the current environment (e.g., "local", "development", "production").
 * Defaults to "local" if NODE_ENV is not explicitly set.
 */
const NODE_ENV = process.env.NODE_ENV || "local";

/**
 * Constructs the path to the environment file based on the current NODE_ENV.
 * Example: ./.env.production, ./.env.local
 */
const envFile = `./.env.${NODE_ENV}`;
// Load environment variables from the determined file path.
config({ path: envFile });

/**
 * Defines the schema for expected environment variables using Zod.
 * Ensures required variables are present and correctly typed.
 * Provides default values where appropriate.
 */
const envSchema = z.object({
    /** The port on which the server will listen. */
    APP_PORT: z.coerce.number().default(3000),
    /** The host address for the server. */
    APP_HOST: z.string().default("localhost"),
    /** The connection string for the PostgreSQL database. */
    DATABASE_URL: z.string().url("Invalid DATABASE_URL format"),
    /** The minimum level for logging messages. */
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

/**
 * Validates the loaded environment variables (process.env) against the defined schema.
 * Throws an error if validation fails, ensuring the application starts with valid configuration.
 * Provides typed access to environment variables.
 */
const env = envSchema.parse(process.env);

/**
 * Exports the validated environment variables (`env`) and the determined environment name (`NODE_ENV`).
 */
export { env, NODE_ENV };