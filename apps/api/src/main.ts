import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService);
  const globalPrefix = config.get<string>('API_GLOBAL_PREFIX') ?? 'api';
  const port = config.get<number>('API_PORT') ?? 3000;
  const webOrigin = config.get<string>('WEB_ORIGIN') ?? 'http://localhost:4200';
  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.setGlobalPrefix(globalPrefix);
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: [
                "'self'",
                'https://api.stripe.com',
                'https://identitytoolkit.googleapis.com',
              ],
              frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: isProd
        ? { maxAge: 15552000, includeSubDomains: true, preload: false }
        : false,
    }),
  );
  // Cloud Run / load balancer: confia no X-Forwarded-* para o throttler por IP
  const httpAdapter = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
  };
  httpAdapter.set?.('trust proxy', 1);
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: webOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['Content-Length'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (!isProd) {
    const docConfig = new DocumentBuilder()
      .setTitle('Agendar Horário API')
      .setVersion('0.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API ouvindo em http://localhost:${port}/${globalPrefix}`);
}

void bootstrap();
