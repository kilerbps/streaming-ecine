import { describe, expect, it } from 'vitest';
import {
  bufferProfile,
  DEFAULT_ESTIMATE,
  formatDataPerHour,
  initialBandwidthEstimate,
  preferredLevelIndex,
  readQualityPreference,
  readStoredEstimate,
  recoveryDelay,
  storeEstimate,
  storeQualityPreference,
  wantsSaveData,
} from './network';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const NOW = Date.UTC(2026, 9, 7);

describe('débit de départ', () => {
  it('reprend la dernière mesure récente de cet appareil', () => {
    expect(initialBandwidthEstimate({ downlink: 10 }, { bps: 900_000, at: NOW - 60_000 }, NOW)).toBe(
      900_000,
    );
  });

  it('ignore une mesure de plus de 3 jours', () => {
    const old = { bps: 900_000, at: NOW - 4 * 24 * 60 * 60 * 1000 };
    expect(initialBandwidthEstimate({ downlink: 2 }, old, NOW)).toBe(1_600_000);
  });

  it('utilise l’estimation du navigateur avec 20 % de marge', () => {
    expect(initialBandwidthEstimate({ downlink: 1.5 }, null, NOW)).toBe(1_200_000);
  });

  it('se rabat sur le type de réseau, puis sur la valeur de hls.js', () => {
    expect(initialBandwidthEstimate({ effectiveType: '3g' }, null, NOW)).toBe(700_000);
    expect(initialBandwidthEstimate({ effectiveType: '2g' }, null, NOW)).toBe(150_000);
    expect(initialBandwidthEstimate(null, null, NOW)).toBe(DEFAULT_ESTIMATE);
  });

  it('borne les valeurs aberrantes', () => {
    expect(initialBandwidthEstimate(null, { bps: 10, at: NOW }, NOW)).toBe(50_000);
    expect(initialBandwidthEstimate({ downlink: 900 }, null, NOW)).toBe(20_000_000);
  });
});

describe('économie de données', () => {
  it('suit la préférence du site ou celle du téléphone', () => {
    expect(wantsSaveData(false, { saveData: true })).toBe(true);
    expect(wantsSaveData(true, null)).toBe(true);
    expect(wantsSaveData(false, { saveData: false })).toBe(false);
  });
});

describe('tampon', () => {
  it('garde 60 s d’avance et 30 s en arrière par défaut', () => {
    expect(bufferProfile(false, 8)).toEqual({
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      backBufferLength: 30,
      maxBufferSize: 60_000_000,
    });
  });

  it('réduit la mémoire sur les téléphones d’entrée de gamme', () => {
    expect(bufferProfile(false, 2).maxBufferSize).toBe(30_000_000);
    expect(bufferProfile(false, null).maxBufferSize).toBe(60_000_000);
  });

  it('charge peu d’avance en économie de données', () => {
    expect(bufferProfile(true, 4).maxBufferLength).toBe(20);
  });
});

describe('reprise après coupure', () => {
  it('espace les tentatives puis plafonne à 30 s', () => {
    expect([0, 1, 2, 3, 4, 9].map(recoveryDelay)).toEqual([
      3_000, 6_000, 12_000, 20_000, 30_000, 30_000,
    ]);
  });
});

describe('qualité mémorisée', () => {
  const levels = [{ height: 720 }, { height: 144 }, { height: 360 }, { height: 240 }];

  it('prend la plus haute qualité qui ne dépasse pas le choix', () => {
    expect(preferredLevelIndex(levels, 360)).toBe(2);
    expect(preferredLevelIndex(levels, 480)).toBe(2);
    expect(preferredLevelIndex(levels, 1080)).toBe(0);
  });

  it('prend la plus basse si toutes dépassent le choix', () => {
    expect(preferredLevelIndex(levels, 100)).toBe(1);
    expect(preferredLevelIndex([], 360)).toBe(-1);
  });

  it('est enregistrée puis relue, « Auto » efface le choix', () => {
    const storage = memoryStorage();
    storeQualityPreference(storage, 360);
    expect(readQualityPreference(storage)).toBe(360);
    storeQualityPreference(storage, null);
    expect(readQualityPreference(storage)).toBeNull();
  });
});

describe('mesure de débit enregistrée', () => {
  it('ignore une valeur invalide ou illisible', () => {
    const storage = memoryStorage();
    storeEstimate(storage, Number.NaN, NOW);
    expect(readStoredEstimate(storage)).toBeNull();
    storage.setItem('ecine:bw', '{oups');
    expect(readStoredEstimate(storage)).toBeNull();
    storeEstimate(storage, 812_345.6, NOW);
    expect(readStoredEstimate(storage)).toEqual({ bps: 812_346, at: NOW });
  });

  it('survit à un stockage indisponible', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqué');
      },
      setItem: () => {
        throw new Error('bloqué');
      },
    } as unknown as Storage;
    expect(() => storeEstimate(broken, 500_000, NOW)).not.toThrow();
    expect(readStoredEstimate(broken)).toBeNull();
    expect(readQualityPreference(null)).toBeNull();
  });
});

describe('consommation affichée', () => {
  it('donne un ordre de grandeur lisible', () => {
    expect(formatDataPerHour(500_000)).toBe('≈ 230 Mo/h');
    expect(formatDataPerHour(290_000)).toBe('≈ 130 Mo/h');
    expect(formatDataPerHour(2_900_000)).toBe('≈ 1,3 Go/h');
    expect(formatDataPerHour(40_000)).toBe('≈ 18 Mo/h');
  });
});
