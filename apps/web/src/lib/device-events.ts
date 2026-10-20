/**
 * Vérification de l'appareil (ADR-0015) entre le lecteur et la vérification invisible de la fiche :
 * le lecteur la demande après un refus `pot_ip` ou `verify`, elle annonce sa réussite.
 */
export const DEVICE_VERIFY_EVENT = 'ecine:device-verify';
export const DEVICE_VERIFIED_EVENT = 'ecine:device-verified';
