import { resolve } from 'node:path';
import { hlsDir, newId, randomAlnum, storageFile } from './storage.js';

const env = { STORAGE_DIR: './storage-test' };
const root = resolve('./storage-test');

describe('stockage', () => {
  it('génère des identifiants et préfixes [a-z0-9] non devinables', () => {
    expect(randomAlnum(12)).toMatch(/^[a-z0-9]{12}$/);
    expect(newId()).toMatch(/^c[a-z0-9]{24}$/);
    expect(newId()).not.toBe(newId());
  });

  it('résout les clés de stockage sous la racine', () => {
    expect(storageFile(env, 'images/cabc')).toBe(resolve(root, 'images/cabc'));
    expect(storageFile(env, 'sources/cabc.mp4')).toBe(resolve(root, 'sources/cabc.mp4'));
    expect(hlsDir(env, 'cvid')).toBe(resolve(root, 'hls/cvid'));
  });

  it('refuse traversée, dossier racine et préfixes inconnus', () => {
    expect(() => storageFile(env, 'images/../../etc/passwd')).toThrow();
    expect(() => storageFile(env, 'images/')).toThrow();
    expect(() => storageFile(env, 'hls/')).toThrow();
    expect(() => hlsDir(env, '')).toThrow();
    expect(() => storageFile(env, 'secrets/cabc')).toThrow();
    expect(() => storageFile(env, '/etc/passwd')).toThrow();
  });
});
