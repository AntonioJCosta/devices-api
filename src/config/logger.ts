import pino from 'pino'
import path from 'path'
import fs from 'fs'
import { env } from './env';

const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logPath = path.join(logDir, 'app.log');

const logger = pino({
  level: env.LOG_LEVEL,
}, pino.destination(logPath));

process.on('SIGINT', () => {
  logger.info('SIGINT caught');
  logger.flush();
  process.exit(0);
});
process.on('SIGQUIT', () => {
  logger.info('SIGQUIT caught');
  logger.flush();
  process.exit(0);
});
process.on('SIGTERM', () => {
  logger.info('SIGTERM caught');
  logger.flush();
  process.exit(0);
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaughtException caught');
  logger.flush();
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'unhandledRejection caught');
  logger.flush();
  process.exit(1);
});

export default logger;