import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { RedisIoAdapter } from './redis-io.adapter';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 0. Global Exception Filter & Logging
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 1. Security: Helmet Headers (Hardened)
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // 2. Enable GZIP Compression
  app.use(compression());

  // 2.5. Cookie Parser for HttpOnly Cookies
  app.use(cookieParser());

  // 3. Global Validation Pipe (Strict)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    errorHttpStatusCode: 422,
  }));

  // 4. Secure CORS (Production Grade)
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 5. Global API Prefix
  app.setGlobalPrefix('api/v1');

  // 6. Setup Redis Adapter for WebSockets
  if (process.env.REDIS_URL) {
    const redisIoAdapter = new RedisIoAdapter(app);
    try {
      await redisIoAdapter.connectToRedis();
      app.useWebSocketAdapter(redisIoAdapter);
      logger.log('Redis Adapter for Socket.IO initialized');
    } catch (e) {
      logger.error('Failed to connect to Redis for Socket.IO');
    }
  }

  // 7. Start Server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`GOZIPP Backend is running on port: ${port} (v1)`);
}
bootstrap();