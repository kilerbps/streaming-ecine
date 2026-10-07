import { SEGMENT_RE } from '../playback/hls-rewrite.js';
import {
  buildHlsArgs,
  buildProbeArgs,
  buildTestSourceArgs,
  InvalidSourceError,
  keyInfoContent,
  parseProbe,
  parseProgress,
  pickLadder,
} from './ffmpeg.js';

/** Valeur de l'option `name` dans l'argv (première occurrence). */
function opt(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function allOpts(args: string[], name: string): string[] {
  return args.flatMap((a, i) => (a === name ? [args[i + 1]!] : []));
}

const base = {
  input: '/data/sources/cabc.mp4',
  outDir: '/data/hls/cvid123',
  keyInfoPath: '/tmp/ecine-key-x/keyinfo',
  segmentPrefix: 'abcdefghij12',
};

describe('pickLadder', () => {
  it('garde les paliers inférieurs ou égaux à la hauteur source, 144p compris', () => {
    expect(pickLadder(1080)).toEqual([144, 240, 360, 480, 720, 1080]);
    expect(pickLadder(2160)).toEqual([144, 240, 360, 480, 720, 1080]);
    expect(pickLadder(720)).toEqual([144, 240, 360, 480, 720]);
    expect(pickLadder(576)).toEqual([144, 240, 360, 480]);
    expect(pickLadder(200)).toEqual([144]);
  });

  it('produit toujours au moins 144p (source très petite)', () => {
    expect(pickLadder(120)).toEqual([144]);
    expect(pickLadder(0)).toEqual([144]);
  });
});

describe('buildHlsArgs', () => {
  const args = buildHlsArgs({ ...base, ladder: [240, 360, 720], hasAudio: true, fps: 25 });

  it('nomme les variantes 240p… pour que le master référence `240p/index.m3u8`', () => {
    expect(opt(args, '-var_stream_map')).toBe(
      'v:0,a:0,name:240p v:1,a:1,name:360p v:2,a:2,name:720p',
    );
    expect(args.at(-1)).toBe('/data/hls/cvid123/%v/index.m3u8');
    expect(opt(args, '-master_pl_name')).toBe('master.m3u8');
  });

  it('écrit des segments au nom non devinable conforme au contrat de lecture', () => {
    expect(opt(args, '-hls_segment_filename')).toBe('/data/hls/cvid123/%v/abcdefghij12_%05d.ts');
    const first = 'abcdefghij12_%05d.ts'.replace('%05d', String(0).padStart(5, '0'));
    expect(SEGMENT_RE.test(first)).toBe(true);
    expect(SEGMENT_RE.test('abcdefghij12_12345.ts')).toBe(true);
  });

  it('chiffre en AES-128 via le fichier keyinfo, segments de 4 s en VOD', () => {
    expect(opt(args, '-hls_key_info_file')).toBe(base.keyInfoPath);
    expect(opt(args, '-hls_time')).toBe('4');
    expect(opt(args, '-hls_playlist_type')).toBe('vod');
    expect(opt(args, '-hls_flags')).toBe('independent_segments');
    expect(opt(args, '-f')).toBe('hls');
  });

  it('décode une seule fois : split + scale en gardant les proportions (largeur paire)', () => {
    expect(opt(args, '-filter_complex')).toBe(
      '[0:v:0]split=3[s0][s1][s2];[s0]scale=w=-2:h=240,format=yuv420p[v0];[s1]scale=w=-2:h=360,format=yuv420p[v1];[s2]scale=w=-2:h=720,format=yuv420p[v2]',
    );
    expect(allOpts(args, '-map').filter((m) => m.startsWith('[v'))).toEqual([
      '[v0]',
      '[v1]',
      '[v2]',
    ]);
  });

  it('H.264 Main, VBR plafonné par palier, GOP aligné sur 4 s sans image clé de scène', () => {
    expect(opt(args, '-c:v:0')).toBe('libx264');
    expect(opt(args, '-preset')).toBe('veryfast');
    expect(opt(args, '-profile:v')).toBe('main');
    expect(opt(args, '-crf')).toBeDefined();
    expect(opt(args, '-maxrate:v:0')).toBe('400k');
    expect(opt(args, '-maxrate:v:1')).toBe('800k');
    expect(opt(args, '-maxrate:v:2')).toBe('2500k');
    expect(opt(args, '-bufsize:v:2')).toBe('5000k');
    expect(opt(args, '-g')).toBe('100');
    expect(opt(args, '-keyint_min')).toBe('100');
    expect(opt(args, '-sc_threshold')).toBe('0');
    expect(opt(args, '-force_key_frames')).toBe('expr:gte(t,n_forced*4)');
  });

  it('AAC 64k jusqu’en 360p, 96k en 480p, 128k à partir de 720p ; une piste audio par variante', () => {
    expect(allOpts(args, '-map').filter((m) => m === '0:a:0')).toHaveLength(3);
    expect(opt(args, '-c:a:0')).toBe('aac');
    expect(opt(args, '-b:a:0')).toBe('64k');
    expect(opt(args, '-b:a:1')).toBe('64k');
    expect(opt(args, '-b:a:2')).toBe('128k');
    const low = buildHlsArgs({ ...base, ladder: [144, 480], hasAudio: true });
    expect(opt(low, '-maxrate:v:0')).toBe('200k');
    expect(opt(low, '-b:a:0')).toBe('64k');
    expect(opt(low, '-b:a:1')).toBe('96k');
  });

  it('source sans audio : aucune piste audio mappée', () => {
    const silent = buildHlsArgs({ ...base, ladder: [240, 360], hasAudio: false });
    expect(silent).not.toContain('0:a:0');
    expect(silent.some((a) => a.startsWith('-c:a'))).toBe(false);
    expect(opt(silent, '-var_stream_map')).toBe('v:0,name:240p v:1,name:360p');
  });

  it('un seul palier : pas de split', () => {
    const single = buildHlsArgs({ ...base, ladder: [240], hasAudio: true });
    expect(opt(single, '-filter_complex')).toBe('[0:v:0]scale=w=-2:h=240,format=yuv420p[v0]');
    expect(opt(single, '-var_stream_map')).toBe('v:0,a:0,name:240p');
  });

  it('GOP de 4 s calculé sur la cadence (25 i/s par défaut)', () => {
    expect(
      opt(buildHlsArgs({ ...base, ladder: [240], hasAudio: false, fps: 30000 / 1001 }), '-g'),
    ).toBe('120');
    expect(opt(buildHlsArgs({ ...base, ladder: [240], hasAudio: false }), '-g')).toBe('100');
  });

  it('suit la progression sur la sortie standard et ne lit jamais l’entrée standard', () => {
    expect(opt(args, '-progress')).toBe('pipe:1');
    expect(args).toContain('-nostdin');
    expect(opt(args, '-i')).toBe(base.input);
  });

  it('retire les métadonnées de la source', () => {
    expect(opt(args, '-map_metadata')).toBe('-1');
  });

  it('refuse un préfixe de segment devinable ou une échelle vide', () => {
    expect(() =>
      buildHlsArgs({ ...base, segmentPrefix: 'seg', ladder: [240], hasAudio: false }),
    ).toThrow();
    expect(() => buildHlsArgs({ ...base, ladder: [], hasAudio: false })).toThrow();
  });
});

describe('keyInfoContent', () => {
  it('écrit URI key://{id}, chemin de la clé et IV', () => {
    expect(keyInfoContent('ck123abc', '/tmp/k/key.bin', '00112233445566778899aabbccddeeff')).toBe(
      'key://ck123abc\n/tmp/k/key.bin\n00112233445566778899aabbccddeeff\n',
    );
  });

  it('refuse un identifiant ou un IV mal formé', () => {
    expect(() => keyInfoContent('CK-1', '/tmp/k', '00'.repeat(16))).toThrow();
    expect(() => keyInfoContent('ck1', '/tmp/k', 'xyz')).toThrow();
  });
});

describe('parseProbe', () => {
  const probe = (streams: unknown[], duration = '42.5') =>
    JSON.stringify({ streams, format: { duration } });

  it('lit durée, dimensions, audio et cadence', () => {
    const result = parseProbe(
      probe([
        { codec_type: 'video', width: 1920, height: 1080, avg_frame_rate: '30000/1001' },
        { codec_type: 'audio' },
      ]),
    );
    expect(result).toEqual({
      durationSec: 42.5,
      width: 1920,
      height: 1080,
      hasAudio: true,
      fps: 30000 / 1001,
    });
  });

  it('détecte l’absence d’audio', () => {
    expect(parseProbe(probe([{ codec_type: 'video', width: 1280, height: 720 }])).hasAudio).toBe(
      false,
    );
  });

  it('applique la rotation des vidéos de téléphone', () => {
    const result = parseProbe(
      probe([
        { codec_type: 'video', width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] },
      ]),
    );
    expect(result.height).toBe(1920);
    expect(result.width).toBe(1080);
  });

  it('ignore une pochette attachée et refuse un fichier sans vidéo', () => {
    expect(() =>
      parseProbe(
        probe([{ codec_type: 'video', width: 600, height: 600, disposition: { attached_pic: 1 } }]),
      ),
    ).toThrow(InvalidSourceError);
    expect(() => parseProbe(probe([{ codec_type: 'audio' }]))).toThrow(InvalidSourceError);
  });

  it('refuse une durée inconnue ou un JSON illisible', () => {
    expect(() =>
      parseProbe(probe([{ codec_type: 'video', width: 640, height: 360 }], 'N/A')),
    ).toThrow(InvalidSourceError);
    expect(() => parseProbe('pas du json')).toThrow(InvalidSourceError);
  });
});

describe('parseProgress', () => {
  it('convertit out_time_ms (microsecondes) en pourcentage', () => {
    expect(parseProgress('out_time_ms=30000000', 60)).toBe(50);
    expect(parseProgress('out_time_us=15000000', 60)).toBe(25);
  });

  it('plafonne à 99 avant la fin et renvoie 100 sur progress=end', () => {
    expect(parseProgress('out_time_ms=90000000', 60)).toBe(99);
    expect(parseProgress('progress=end', 60)).toBe(100);
  });

  it('ignore les autres lignes et les valeurs invalides', () => {
    expect(parseProgress('frame=120', 60)).toBeNull();
    expect(parseProgress('out_time_ms=N/A', 60)).toBeNull();
    expect(parseProgress('out_time_ms=-9223372036854775807', 60)).toBeNull();
    expect(parseProgress('out_time_ms=1000000', 0)).toBeNull();
  });
});

describe('arguments annexes', () => {
  it('ffprobe en JSON avec flux et format', () => {
    expect(buildProbeArgs('/data/in.mov')).toEqual([
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '/data/in.mov',
    ]);
  });

  it('source de démonstration : mire 1280×720 + sinus, 40 s', () => {
    const args = buildTestSourceArgs('/data/sources/demo.mp4');
    expect(args).toContain('testsrc2=size=1280x720:rate=25');
    expect(args.some((a) => a.startsWith('sine='))).toBe(true);
    expect(opt(args, '-t')).toBe('40');
    expect(args.at(-1)).toBe('/data/sources/demo.mp4');
  });
});
