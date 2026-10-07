import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { ENV, type Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const env = app.get<Env>(ENV);
  app.useLogger(app.get(Logger));
  configureApp(app, env);
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  app
    .get(Logger)
    .log(
      `API E-Ciné prête sur le port ${env.PORT}${env.SWAGGER_ENABLED ? ' (documentation : /docs)' : ''}`,
    );
}

await bootstrap();
