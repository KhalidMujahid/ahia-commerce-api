import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
// solo
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 5000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const apiVersion = configService.get<string>('app.apiVersion') || 'v1';
  app.setGlobalPrefix(`api/${apiVersion}`);

  // if (nodeEnv === 'development') {
    AppModule.setupSwagger(app);
  // }

  await app.listen(port,'0.0.0.0');
  logger.log(`Server isrunning ß on: http://localhost:${port}/api/${apiVersion}`);
}

bootstrap();