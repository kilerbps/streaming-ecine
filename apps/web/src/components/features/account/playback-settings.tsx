'use client';

import { useTranslations } from 'next-intl';
import { useId, useSyncExternalStore } from 'react';
import { FILM_LANGUAGES } from '@ecine/contracts';
import {
  DEFAULT_SUBTITLES,
  localStore,
  readQualityPreference,
  readSubtitlePreference,
  storeQualityPreference,
  storeSubtitlePreference,
  type SubtitlePreference,
  type SubtitleSize,
} from '@/components/features/player/network';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Choice, Group } from './preferences-panel';

/**
 * Qualités proposées et données consommées au plus par heure : débits plafonds vidéo + audio de
 * l'échelle de transcodage (apps/api/src/worker/ffmpeg.ts, RUNG_RATES) × 3 600 s ÷ 8.
 */
const QUALITIES = [
  { height: 720, data: '1,2 Go' },
  { height: 480, data: '580 Mo' },
  { height: 360, data: '390 Mo' },
  { height: 240, data: '210 Mo' },
  { height: 144, data: '120 Mo' },
] as const;

/** Abonnement au stockage : autres onglets (`storage`) et changements faits ici. */
const EVENT = 'ecine:playback-prefs';
function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

// Instantanés en chaînes (comparés par valeur), analysés au rendu ; défauts côté serveur.
const qualitySnapshot = () => String(readQualityPreference(localStore()) ?? 'auto');
const subtitlesSnapshot = () => JSON.stringify(readSubtitlePreference(localStore()));
const serverQuality = () => 'auto';
const serverSubtitles = () => JSON.stringify(DEFAULT_SUBTITLES);

const SELECT =
  'min-h-11 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-[15px] text-text md:max-w-xs';

/**
 * Réglages → Lecture : qualité préférée (même mémoire que le choix fait dans le lecteur) et
 * sous-titres (langue par défaut, taille). Rangés sur l'appareil, sans compte.
 */
export function PlaybackSettings() {
  const t = useTranslations('prefs');
  const tl = useTranslations('languages');
  const qualityId = useId();
  const langId = useId();
  // Stockage de l'appareil lu sans écart d'hydratation (défauts au rendu serveur).
  const quality = useSyncExternalStore(subscribe, qualitySnapshot, serverQuality);
  const subtitles = JSON.parse(
    useSyncExternalStore(subscribe, subtitlesSnapshot, serverSubtitles),
  ) as SubtitlePreference;

  const saveSubtitles = (next: SubtitlePreference) => {
    storeSubtitlePreference(localStore(), next);
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <Group title={t('playback')}>
      <Choice label={t('quality')} help={t('qualityHelp')}>
        <label htmlFor={qualityId} className="sr-only">
          {t('quality')}
        </label>
        <select
          id={qualityId}
          className={SELECT}
          value={quality}
          onChange={(event) => {
            const next = event.target.value === 'auto' ? null : Number(event.target.value);
            storeQualityPreference(localStore(), next);
            window.dispatchEvent(new Event(EVENT));
          }}
        >
          <option value="auto">{t('qualityAuto')}</option>
          {QUALITIES.map((q) => (
            <option key={q.height} value={q.height}>
              {t('qualityOption', { height: q.height, data: q.data })}
            </option>
          ))}
        </select>
      </Choice>
      <Choice label={t('subtitles')} help={t('subtitlesHelp')}>
        <label htmlFor={langId} className="sr-only">
          {t('subtitlesLang')}
        </label>
        <select
          id={langId}
          className={SELECT}
          value={subtitles.lang ?? 'off'}
          onChange={(event) =>
            saveSubtitles({
              ...subtitles,
              lang: event.target.value === 'off' ? null : event.target.value,
            })
          }
        >
          <option value="off">{t('subtitlesOff')}</option>
          {FILM_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {tl(lang).charAt(0).toUpperCase() + tl(lang).slice(1)}
            </option>
          ))}
        </select>
        <SegmentedControl<SubtitleSize>
          label={t('subtitlesSize')}
          value={subtitles.size}
          onChange={(size) => saveSubtitles({ ...subtitles, size })}
          options={[
            { value: 's', label: t('sizeSmall') },
            { value: 'm', label: t('sizeMedium') },
            { value: 'l', label: t('sizeLarge') },
          ]}
        />
      </Choice>
    </Group>
  );
}
