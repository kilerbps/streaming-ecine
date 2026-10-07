import { detectVideoContainer, matchesVideoSignature } from './video-source.js';

const mp4Head = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x20]),
  Buffer.from('ftypisom'),
  Buffer.alloc(20),
]);
const movHead = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x14]),
  Buffer.from('ftypqt  '),
  Buffer.alloc(20),
]);
const mkvHead = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(28)]);

describe('signature des fichiers vidéo', () => {
  it('reconnaît MP4/MOV (ftyp) et Matroska/WebM (EBML)', () => {
    expect(detectVideoContainer(mp4Head)).toBe('iso-bmff');
    expect(detectVideoContainer(movHead)).toBe('iso-bmff');
    expect(detectVideoContainer(mkvHead)).toBe('matroska');
  });

  it('refuse un contenu inconnu ou trop court', () => {
    expect(detectVideoContainer(Buffer.from('<?php echo 1; ?>'))).toBeNull();
    expect(detectVideoContainer(Buffer.from([0x1a, 0x45]))).toBeNull();
    expect(detectVideoContainer(Buffer.from('%PDF-1.7 ftyp'))).toBeNull();
  });

  it('exige la cohérence entre type déclaré et signature réelle', () => {
    expect(matchesVideoSignature(mp4Head, 'video/mp4')).toBe(true);
    expect(matchesVideoSignature(movHead, 'video/quicktime')).toBe(true);
    expect(matchesVideoSignature(mkvHead, 'video/webm')).toBe(true);
    expect(matchesVideoSignature(mkvHead, 'video/x-matroska')).toBe(true);
    expect(matchesVideoSignature(mkvHead, 'video/mp4')).toBe(false);
    expect(matchesVideoSignature(mp4Head, 'video/webm')).toBe(false);
    expect(matchesVideoSignature(mp4Head, 'application/x-msdownload')).toBe(false);
  });
});
