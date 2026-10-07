import { slugSchema } from '@ecine/contracts';

export const DEMO_VIDEO_USAGE =
  'Usage : node dist/seed/demo-video.js <slug-du-film>|--all [--seconds 5-1800]';

export interface DemoVideoArgs {
  slug: string | null;
  all: boolean;
  seconds: number;
}

/** Arguments de `demo-video.js` : un slug ou `--all`, et une durée facultative (40 s par défaut). */
export function parseDemoVideoArgs(argv: readonly string[]): DemoVideoArgs {
  const secondsAt = argv.indexOf('--seconds');
  const seconds = secondsAt >= 0 ? Number(argv[secondsAt + 1]) : 40;
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 1800) {
    throw new Error(DEMO_VIDEO_USAGE);
  }
  const all = argv.includes('--all');
  if (all) return { slug: null, all, seconds };
  const positional = argv.filter(
    (arg, i) => !arg.startsWith('--') && !(secondsAt >= 0 && i === secondsAt + 1),
  );
  const slug = slugSchema.safeParse(positional[0]);
  if (!slug.success) throw new Error(DEMO_VIDEO_USAGE);
  return { slug: slug.data, all, seconds };
}
