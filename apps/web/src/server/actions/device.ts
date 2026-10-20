'use server';

import { cookies } from 'next/headers';
import { deviceVerificationSchema, type DeviceVerification } from '@ecine/contracts';
import { z } from 'zod';
import { privateRequest } from '../api-client';
import { serverConfig } from '../config';
import { DEVICE_COOKIE_MAX_AGE, deviceCookieName, openDevice, sealDevice } from '../device';
import { fromError, invalid, ok, type ActionResult } from './result';

const tokenSchema = z.string().min(1).max(2048).optional();

/**
 * Vérification de l'appareil (Turnstile invisible sur la fiche d'un film, ADR-0015) : l'API constate
 * le jeton, puis le site scelle la fin de vérification dans le cookie d'appareil. L'appareil sort
 * alors du pot commun des appareils neufs de son IP.
 */
export async function verifyDeviceAction(
  turnstileToken?: string,
): Promise<ActionResult<DeviceVerification>> {
  const parsed = tokenSchema.safeParse(turnstileToken);
  if (!parsed.success) return invalid(parsed.error);
  const config = serverConfig();
  const jar = await cookies();
  const name = deviceCookieName(config.COOKIE_SECURE);
  const device = openDevice(config.DEVICE_COOKIE_SECRET, jar.get(name)?.value);
  if (!device) {
    return { ok: false, code: 'validation', error: 'Appareil inconnu. Rechargez la page.' };
  }
  try {
    const result = await privateRequest(deviceVerificationSchema, '/devices/verify', {
      method: 'POST',
      body: { turnstileToken: parsed.data },
    });
    jar.set({
      name,
      value: sealDevice(config.DEVICE_COOKIE_SECRET, {
        ...device,
        verifiedUntil: result.verifiedUntil,
      }),
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: DEVICE_COOKIE_MAX_AGE,
    });
    return ok(result);
  } catch (error) {
    return fromError(error);
  }
}
