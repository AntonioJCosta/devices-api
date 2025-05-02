import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import devicesRoutes from './routes/devices'
import { env } from './config/env'

const { APP_PORT, APP_HOST } = env

const app = new Elysia()
  .use(devicesRoutes)
  .use(swagger())
  .listen({
    hostname: APP_HOST,
    port: APP_PORT
  })

console.log(`🦊 API is running on ${APP_HOST}:${APP_PORT}`)