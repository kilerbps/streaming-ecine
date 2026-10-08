'use client';

/**
 * Sons d'E-Ciné (charte « Nuit de Kin », D-08) : les apps natives sont silencieuses au toucher, donc
 * les sons de l'interface (J'aime, Ma liste, succès, erreur) sont coupés par défaut ; seul le clap
 * au lancement d'un film, moment de marque, est actif par défaut. Synthétisés avec Web Audio (aucun
 * fichier tiers) en attendant le clap commandé à un sound designer. Le contexte audio n'est créé
 * qu'après un geste de l'utilisateur.
 */
export type SoundName = 'like' | 'bookmark' | 'clap' | 'success' | 'error';

interface Note {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<SoundName, Note[]> = {
  like: [
    { freq: 660, start: 0, duration: 0.08 },
    { freq: 990, start: 0.07, duration: 0.12 },
  ],
  bookmark: [
    { freq: 523, start: 0, duration: 0.09 },
    { freq: 784, start: 0.1, duration: 0.12 },
  ],
  clap: [
    { freq: 180, start: 0, duration: 0.03, type: 'square', gain: 0.35 },
    { freq: 1200, start: 0.005, duration: 0.05, type: 'triangle', gain: 0.2 },
  ],
  success: [
    { freq: 523, start: 0, duration: 0.18 },
    { freq: 659, start: 0.03, duration: 0.18 },
    { freq: 784, start: 0.06, duration: 0.22 },
  ],
  error: [
    { freq: 196, start: 0, duration: 0.12, type: 'square', gain: 0.25 },
    { freq: 185, start: 0.15, duration: 0.12, type: 'square', gain: 0.25 },
  ],
};

/** Volume maître volontairement bas (inférieur au son des films). */
const MASTER_GAIN = 0.12;

let context: AudioContext | null = null;
const settings = { clap: true, ui: false };

/** Réglages « Son au lancement d'un film » et « Sons de l'interface ». */
export function setSoundSettings(next: { clap: boolean; ui: boolean }): void {
  settings.clap = next.clap;
  settings.ui = next.ui;
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** À appeler uniquement depuis un gestionnaire d'événement utilisateur (clic, toucher, touche). */
export function playSound(name: SoundName): void {
  if (!(name === 'clap' ? settings.clap : settings.ui)) return;
  const ctx = getContext();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);
  const now = ctx.currentTime;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.freq;
    const peak = note.gain ?? 0.5;
    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(peak, now + note.start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    osc.connect(gain).connect(master);
    osc.start(now + note.start);
    osc.stop(now + note.start + note.duration + 0.02);
  }
}
