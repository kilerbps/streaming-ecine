import { describe, expect, it } from 'vitest';
import { posterRect } from './share-image.service.js';

describe('affiche des images de partage', () => {
  it('prend le recadrage 2:3 enregistré', () => {
    expect(
      posterRect(
        { width: 1000, height: 1500 },
        { focal: null, crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } },
      ),
    ).toEqual({ left: 100, top: 300, width: 500, height: 750 });
  });

  it('centre un 2:3 sur le point focal dans une image paysage, sans sortir', () => {
    const rect = posterRect(
      { width: 1920, height: 1080 },
      { focal: { x: 0.95, y: 0.5 }, crop: null },
    );
    expect(rect).toEqual({ left: 1200, top: 0, width: 720, height: 1080 });
  });

  it('garde toute une affiche déjà en 2:3', () => {
    expect(posterRect({ width: 1280, height: 1920 }, { focal: null, crop: null })).toEqual({
      left: 0,
      top: 0,
      width: 1280,
      height: 1920,
    });
  });
});
