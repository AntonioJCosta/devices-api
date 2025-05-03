import { config } from "dotenv";
import { z } from "zod";

/**
 * Determines the current environment (e.g., "development", "production").
 * If NODE_ENV is not set, it remains undefined.
 */
const {NODE_ENV} = process.env;

/**
 * Constructs the path to the environment file.
 * Uses .env.${NODE_ENV} if NODE_ENV is set, otherwise defaults to .env.
 */
const envFile = NODE_ENV ? `./.env.${NODE_ENV}` : './.env';
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
    /** The name of the database. */
    DB_NAME: z.string().default("postgres"),
    /** The username for database authentication. */
    DB_USER: z.string().default("postgres"),
    /** The password for database authentication. */
    DB_PASSWORD: z.string().default("postgres"),
    /** The host address of the database server. */
    DB_HOST: z.string().default("localhost"),
    /** The port on which the database server is running. */
    DB_PORT: z.coerce.number().default(5432),
    /** The minimum level for logging messages. */
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

/**
 * Validates the loaded environment variables (process.env) against the defined schema.
 * Throws an error if validation fails, ensuring the application starts with valid configuration.
 * Provides typed access to environment variables.
 */
const env = envSchema.parse(process.env);
const DB_URL = `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;

/**
 * Exports the validated environment variables (`env`) and the determined environment name (`NODE_ENV`).
 */
export { env, NODE_ENV, DB_URL };