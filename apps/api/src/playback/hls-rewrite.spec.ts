import { rewriteMaster, rewriteVariant } from './hls-rewrite.js';

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
