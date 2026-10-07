import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { Env } from '../config/env.js';

const REQUEST_ID = /^[a-zA-Z0-9-]{8,64}$/;

/**
 * Journaux pino structurés, corrélés par X-Request-Id, sans donnée personnelle :
 * ni IP, ni en-têtes, ni chaîne de requête (elle peut porter un jeton de lecture).
 */
export function loggerParams(env: Env): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      genReqId(req: IncomingMessage, res: ServerResponse) {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          path: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      redact: { paths: ['req.headers', 'res.headers', 'email', 'password', 'token'], remove: true },
      autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' },
      customLogLevel(_req: IncomingMessage, res: ServerResponse, err?: Error) {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    },
  };
}
