import { parseDemoVideoArgs } from './demo-video-args.js';

describe('arguments de demo-video', () => {
  it('lit un slug seul, avec la durée par défaut', () => {
    expect(parseDemoVideoArgs(['matonge-minuit'])).toEqual({
      slug: 'matonge-minuit',
      all: false,
      seconds: 40,
    });
  });

  it('lit la durée avant ou après le slug', () => {
    expect(parseDemoVideoArgs(['le-chant', '--seconds', '300']).seconds).toBe(300);
    expect(parseDemoVideoArgs(['--seconds', '300', 'le-chant'])).toEqual({
      slug: 'le-chant',
      all: false,
      seconds: 300,
    });
  });

  it('accepte --all sans slug', () => {
    expect(parseDemoVideoArgs(['--all'])).toEqual({ slug: null, all: true, seconds: 40 });
  });

  it('refuse un appel incomplet ou une durée hors limites', () => {
    expect(() => parseDemoVideoArgs([])).toThrow(/Usage/);
    expect(() => parseDemoVideoArgs(['--seconds', '300'])).toThrow(/Usage/);
    expect(() => parseDemoVideoArgs(['film', '--seconds', '2'])).toThrow(/Usage/);
    expect(() => parseDemoVideoArgs(['film', '--seconds', 'abc'])).toThrow(/Usage/);
  });
});
