import {
  applyDecorators,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBody, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { map, type Observable } from 'rxjs';
import { z } from 'zod';

const RETURNS = 'ecine:returns';

function jsonSchema(schema: z.ZodType, io: 'input' | 'output') {
  return z.toJSONSchema(schema, { io, unrepresentable: 'any' }) as Record<string, unknown>;
}

/**
 * Déclare le contrat de sortie d'une route. La réponse est revalidée (et les champs non déclarés
 * retirés) avant envoi : aucune entité Prisma brute ni champ sensible ne peut fuiter.
 */
export function Returns(schema: z.ZodType) {
  return applyDecorators(
    SetMetadata(RETURNS, schema),
    ApiOkResponse({ schema: jsonSchema(schema, 'output') }),
  );
}

/** Documente un corps de requête dans OpenAPI à partir du schéma Zod. */
export function BodySchema(schema: z.ZodType) {
  return ApiBody({ schema: jsonSchema(schema, 'input') });
}

/** Documente les paramètres de requête dans OpenAPI à partir d'un objet Zod. */
export function QuerySchema(schema: z.ZodObject) {
  const decorators = Object.entries(schema.shape).map(([name, field]) =>
    ApiQuery({
      name,
      required: !(field as z.ZodType).safeParse(undefined).success,
      schema: jsonSchema(field as z.ZodType, 'input'),
    }),
  );
  return applyDecorators(...decorators);
}

@Injectable()
export class ReturnsInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const schema = this.reflector.get<z.ZodType | undefined>(RETURNS, context.getHandler());
    if (!schema) return next.handle();
    return next.handle().pipe(map((value: unknown) => schema.parse(value)));
  }
}
