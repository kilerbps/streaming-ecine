import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, privateRequest } from '@/server/api-client';

/** Export des données personnelles (droit d'accès) : fichier JSON téléchargé, jamais mis en cache. */
export async function GET() {
  try {
    const data = await privateRequest(z.record(z.string(), z.unknown()), '/me/export');
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="e-cine-mes-donnees.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json(
      { title: status === 401 ? 'Connexion requise' : 'Export impossible' },
      { status },
    );
  }
}
