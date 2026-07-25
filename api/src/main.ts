import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Lets Nest run onModuleDestroy (closing the pg pool cleanly) on SIGTERM/
  // SIGINT instead of the process being killed mid-request or mid-transaction.
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
