import { describe, expect, it, vi } from 'vitest';
import { createPlaybackMeter } from './playback-meter';

function setup() {
  const send = vi.fn();
  let clock = 1_000;
  const meter = createPlaybackMeter('cfilm1', 'resume', send, () => clock);
  return { send, meter, advance: (ms: number) => (clock += ms) };
}

const types = (send: ReturnType<typeof vi.fn>) => send.mock.calls.map(([e]) => e.type);

describe('mesure d’une lecture', () => {
  it('mesure le temps entre le toucher et la première image, une seule fois', () => {
    const { send, meter, advance } = setup();
    meter.begin();
    advance(1_840);
    meter.firstFrame();
    meter.firstFrame();
    expect(send.mock.calls).toEqual([
      [{ type: 'play_start', targetType: 'FILM', targetId: 'cfilm1', source: 'resume' }],
      [
        {
          type: 'play_first_frame',
          targetType: 'FILM',
          targetId: 'cfilm1',
          source: 'resume',
          value: 1_840,
        },
      ],
    ]);
  });

  it('envoie la progression toutes les 10 s de lecture effective, sans compter les sauts ni la pause', () => {
    const { send, meter } = setup();
    meter.time(0, 600, false);
    for (let t = 0.25; t <= 9.75; t += 0.25) meter.time(t, 600, false);
    expect(types(send)).toEqual([]);
    meter.time(120, 600, false); // saut : non compté
    meter.time(120.25, 600, true); // en pause : non compté
    meter.time(120.5, 600, false);
    meter.time(120.75, 600, false);
    expect(send).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'play_progress', value: 120 }),
    );
    expect(types(send)).toEqual(['play_progress']);
  });

  it('marque l’achèvement à 90 % de la durée, une seule fois', () => {
    const { send, meter } = setup();
    meter.time(89, 100, false);
    meter.time(90, 100, false);
    meter.time(91, 100, false);
    expect(types(send).filter((t) => t === 'play_complete')).toHaveLength(1);
  });
});
