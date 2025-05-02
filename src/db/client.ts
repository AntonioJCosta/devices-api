import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env'

/**
 * Initializes the underlying PostgreSQL connection pool using the connection string from environment variables.
 * The non-null assertion (!) assumes DATABASE_URL is always defined, which should be ensured by env validation.
 */
const queryClient = postgres(env.DATABASE_URL!)

/**
 * Exports the Drizzle ORM instance configured with the PostgreSQL client.
 * This instance is used throughout the application for database interactions.
 */
export const db = drizzle(queryClient)