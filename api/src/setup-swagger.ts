import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Generated from the same TypeScript types and class-validator DTOs the app
 * already uses (via the @nestjs/swagger/plugin CLI plugin in nest-cli.json),
 * not hand-written -- so the docs can't drift from what the endpoints
 * actually accept and return the way a hand-maintained spec would.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ShopSense API')
    .setDescription(
      'POS API for small Ghanaian retail shops: inventory, sales, discount-aware ' +
        'reconciliation, and Claude-powered restock recommendations and daily briefings. ' +
        'Every endpoint except /health requires a Supabase Auth Bearer token -- click ' +
        '"Authorize" below and paste an access token to try requests from this page.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Supabase Auth access token' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
}
