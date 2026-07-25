import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import type { Env } from './config/env.schema';

/**
 * Everything main.ts's bootstrap() applies to a real running app, beyond just
 * compiling AppModule. Test.createTestingModule().createNestApplication() in
 * e2e tests does NOT go through main.ts, so without calling this too, the
 * global prefix/validation/error-shape a real request gets would silently be
 * absent from what the tests actually exercise.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get(ConfigService<Env>);
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true }) ?? 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
}
