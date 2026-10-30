import { validateEnvironment } from './environment.js';

describe('validateEnvironment', () => {
  it('applies safe defaults and parses the port', () => {
    expect(
      validateEnvironment({ DATABASE_URL: 'postgresql://localhost/uss' }),
    ).toMatchObject({
      PORT: 8000,
      NODE_ENV: 'development',
    });
  });

  it('rejects a non-PostgreSQL database URL', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'mongodb://localhost/uss' }),
    ).toThrow('DATABASE_URL must be a PostgreSQL connection URL.');
  });

  it('rejects an invalid port', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost/uss',
        PORT: '70000',
      }),
    ).toThrow('PORT must be an integer between 1 and 65535.');
  });
});
