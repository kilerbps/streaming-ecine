import { mediaHrefs, rewriteMaster, rewriteVariant } from './hls-rewrite.js';

describe('réécriture HLS', () => {
  it('ajoute le jeton aux variantes du master', () => {
    const master = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240',
      '240p/index.m3u8',
    ].join('\n');
    const out = rewriteMaster(master, (r) => `https://api/v1/playback/v1/${r}/index.m3u8?t=JETON`);
    expect(out).toContain('https://api/v1/playback/v1/240p/index.m3u8?t=JETON');
    expect(out).not.toMatch(/^240p\/index\.m3u8$/m);
  });

  it('réécrit segments et clé, sans exposer de chemin interne', () => {
    const variant = [
      '#EXTM3U',
      '#EXT-X-KEY:METHOD=AES-128,URI="key://ck123abc",IV=0x0000000000000000000000000000abcd',
      '#EXTINF:6.0,',
      'abcdefghij12_00000.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');
    const out = rewriteVariant(
      variant,
      (s) => `https://media/hls/v1/240p/${s}?t=JETON`,
      (k) => `https://api/v1/playback/keys/${k}?t=JETON`,
    );
    expect(out).toContain('URI="https://api/v1/playback/keys/ck123abc?t=JETON"');
    expect(out).toContain('https://media/hls/v1/240p/abcdefghij12_00000.ts?t=JETON');
    expect(out).not.toContain('key://');
    expect(out).toContain('IV=0x0000000000000000000000000000abcd');
  });

  it('ignore les lignes inattendues (aucune injection de chemin)', () => {
    const out = rewriteVariant(
      '../../etc/passwd\n#EXTINF:6.0,',
      () => 'X',
      () => 'Y',
    );
    expect(out).toBe('../../etc/passwd\n#EXTINF:6.0,');
  });
});

describe('listes sans jeton pour hls.js (ADR-0015)', () => {
  const hrefs = (token: string, bare: boolean) =>
    mediaHrefs({
      api: 'https://api.test',
      media: 'https://media.test',
      videoId: 'v1',
      token,
      bare,
    });

  it('garde la même adresse de clé d’un jeton à l’autre : la clé n’est chargée qu’une fois', () => {
    expect(hrefs('jeton-1', true).key('k1')).toBe('https://api.test/v1/playback/keys/k1?v=v1');
    expect(hrefs('jeton-2', true).key('k1')).toBe(hrefs('jeton-1', true).key('k1'));
    expect(hrefs('jeton-1', true).segment('240p', 'abc_00001.ts')).toBe(
      'https://media.test/hls/v1/240p/abc_00001.ts',
    );
    expect(hrefs('jeton-1', true).variant('240p')).toBe(
      'https://api.test/v1/playback/v1/240p/index.m3u8?bare=1',
    );
  });

  it('porte le jeton dans chaque adresse pour le HLS natif', () => {
    const native = hrefs('a b', false);
    expect(native.key('k1')).toBe('https://api.test/v1/playback/keys/k1?t=a%20b&v=v1');
    expect(native.segment('240p', 'abc_00001.ts')).toBe(
      'https://media.test/hls/v1/240p/abc_00001.ts?t=a%20b',
    );
    expect(native.variant('240p')).toBe('https://api.test/v1/playback/v1/240p/index.m3u8?t=a%20b');
  });
});
