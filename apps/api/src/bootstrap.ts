import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { configureStatic, configureUploadParsers } from './media/static.js';

/**
 * Configuration HTTP de l'application, partagée par le serveur (main.ts) et les tests d'intégration :
 * les tests vérifient exactement ce qui tourne en production.
 */
export function configureApp(app: NestExpressApplication, env: Env): void {
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
    }),
  );
  // L'API ne sert jamais de HTML : CSP fermée sur toute réponse, y compris les directives sans repli
  // (frame-ancestors, form-action, base-uri). Seule la documentation de développement (/docs) en est exemptée.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );
    const isDocs = env.SWAGGER_ENABLED && req.path.startsWith('/docs');
    if (!isDocs) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'",
      );
    }
    // Hors des préfixes de l'API : 404 au format RFC 9457 (au lieu de la page HTML par défaut d'Express).
    if (!isDocs && !/^\/(v1|health|media)(\/|$)/.test(req.path)) {
      res
        .status(404)
        .type('application/problem+json')
        .json({ type: 'about:blank', title: 'Introuvable', status: 404, instance: req.path });
      return;
    }
    next();
  });
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { limit: '100kb', extended: false });
  configureUploadParsers(app);

  const origins = [
    env.APP_URL,
    ...env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];
  app.enableCors({
    origin: origins,
    credentials: false,
    methods: ['GET', 'HEAD', 'OPTIONS'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'media/{*path}', method: RequestMethod.ALL },
    ],
  });
  configureStatic(app, env);

  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('E-Ciné API')
      .setDescription(
        'API de la plateforme E-Ciné (docs/04-API-SPEC.md). Erreurs au format RFC 9457.',
      )
      .setVersion('1')
      .addCookieAuth('ecine_at')
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
      jsonDocumentUrl: 'docs/openapi.json',
    });
  }
}
