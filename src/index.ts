// filepath: /opt/challenges/1global/devices-api/src/index.ts
import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import devicesRoutes from './routes/devices'
import { env } from './config/env'
import logger from './config/logger' 

const { APP_PORT, APP_HOST } = env

const app = new Elysia()
  .onError(({ code, error, set }) => {
    logger.error({
        code,
        err: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        },
    }, `Unhandled error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);

    set.status = 500;

    return {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred on the server.'
    };
  })
  .use(devicesRoutes)
  .use(swagger())
  .listen({
    hostname: APP_HOST,
    port: APP_PORT
  })

console.log(`🦊 API is running on ${APP_HOST}:${APP_PORT}`)