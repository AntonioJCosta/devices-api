import { Elysia } from 'elysia'
import devicesRoutes from './routes/devices'

const app = new Elysia()
  .use(devicesRoutes)
  .listen(3001)

console.log(`🦊 Devices API rodando em http://localhost:${app.server?.port}`)
