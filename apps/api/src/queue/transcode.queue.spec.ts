import { redisConnectionOptions, transcodeJobOptions } from './transcode.queue.js';

describe('connexion Redis de BullMQ', () => {
  it('décode hôte, port, mot de passe et base', () => {
    expect(redisConnectionOptions('redis://:mot%40passe@localhost:56379/2')).toEqual({
      host: 'localhost',
      port: 56379,
      password: 'mot@passe',
      db: 2,
      maxRetriesPerRequest: null,
    });
  });

  it('active TLS avec rediss:// et garde l’utilisateur', () => {
    expect(redisConnectionOptions('rediss://ecine:secret@redis.example:6380')).toMatchObject({
      host: 'redis.example',
      port: 6380,
      username: 'ecine',
      password: 'secret',
      tls: {},
    });
  });

  it('port par défaut 6379, refuse un autre protocole', () => {
    expect(redisConnectionOptions('redis://cache').port).toBe(6379);
    expect(() => redisConnectionOptions('http://cache')).toThrow();
  });
});

describe('tâche de transcodage', () => {
  it('une tâche par vidéo, 2 tentatives espacées', () => {
    expect(transcodeJobOptions('cvid1')).toMatchObject({
      jobId: 'cvid1',
      attempts: 2,
      backoff: { type: 'exponential' },
    });
  });
});
