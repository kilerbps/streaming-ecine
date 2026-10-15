/** Segments de Nouveautés, dans l'ordre affiché ; la valeur est aussi celle de `?vue=`. */
export const WHATS_NEW_SEGMENTS = ['bientot', 'evenements', 'actualites'] as const;
export type WhatsNewSegment = (typeof WHATS_NEW_SEGMENTS)[number];
