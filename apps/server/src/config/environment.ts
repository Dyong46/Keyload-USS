export type Environment = {
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
};

const nodeEnvironments = ['development', 'test', 'production'] as const;

export function validateEnvironment(
  raw: Record<string, unknown>,
): Environment & Record<string, unknown> {
  const databaseUrl = String(raw.DATABASE_URL ?? '');
  if (!databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }

  const port = Number(raw.PORT ?? 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const nodeEnvironment = String(raw.NODE_ENV ?? 'development');
  if (
    !nodeEnvironments.includes(
      nodeEnvironment as (typeof nodeEnvironments)[number],
    )
  ) {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  return {
    ...raw,
    DATABASE_URL: databaseUrl,
    NODE_ENV: nodeEnvironment as Environment['NODE_ENV'],
    PORT: port,
  };
}
