import { Test, TestingModule } from '@nestjs/testing';
import { fileURLToPath } from 'node:url';
import { ConfigModule, ConfigService } from '../../lib/index.js';

const envFilePath = fileURLToPath(
  new URL('.env.async', import.meta.url),
);

describe('Async environment variables', () => {
  const trackedKeys = [
    'ASYNC_ENV_VALUE',
    'ASYNC_ENV_CONFLICT',
    'ASYNC_ENV_FIRST',
    'ASYNC_ENV_VALIDATED',
  ] as const;
  let originalValues: Record<string, string | undefined>;

  beforeEach(() => {
    originalValues = Object.fromEntries(
      trackedKeys.map(key => [key, process.env[key]]),
    );
    trackedKeys.forEach(key => delete process.env[key]);
  });

  afterEach(() => {
    trackedKeys.forEach(key => {
      const originalValue = originalValues[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    });
  });

  async function createTestingModule(
    options: Parameters<typeof ConfigModule.forRoot>[0],
  ): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [ConfigModule.forRoot(options)],
    }).compile();
  }

  it('loads values before the configuration module is initialized', async () => {
    const moduleRef = await createTestingModule({
      ignoreEnvFile: true,
      asyncEnvVars: [async () => ({ ASYNC_ENV_VALUE: 'remote' })],
    });

    try {
      const configService = moduleRef.get(ConfigService);
      expect(configService.get('ASYNC_ENV_VALUE')).toBe('remote');
      expect(process.env.ASYNC_ENV_VALUE).toBe('remote');
    } finally {
      await moduleRef.close();
    }
  });

  it('overrides environment files and existing process variables', async () => {
    process.env.ASYNC_ENV_CONFLICT = 'process';

    const moduleRef = await createTestingModule({
      envFilePath,
      override: false,
      asyncEnvVars: [
        async () => ({ ASYNC_ENV_CONFLICT: 'remote' }),
      ],
    });

    try {
      const configService = moduleRef.get(ConfigService);
      expect(configService.get('ASYNC_ENV_CONFLICT')).toBe('remote');
      expect(process.env.ASYNC_ENV_CONFLICT).toBe('remote');
    } finally {
      await moduleRef.close();
    }
  });

  it('merges factories in declaration order', async () => {
    const moduleRef = await createTestingModule({
      ignoreEnvFile: true,
      asyncEnvVars: [
        async () => ({
          ASYNC_ENV_FIRST: 'first',
          ASYNC_ENV_CONFLICT: 'first',
        }),
        async () => ({ ASYNC_ENV_CONFLICT: 'second' }),
      ],
    });

    try {
      const configService = moduleRef.get(ConfigService);
      expect(configService.get('ASYNC_ENV_FIRST')).toBe('first');
      expect(configService.get('ASYNC_ENV_CONFLICT')).toBe('second');
    } finally {
      await moduleRef.close();
    }
  });

  it('loads asynchronous values before validation', async () => {
    let valueSeenByValidation: unknown;

    const moduleRef = await createTestingModule({
      ignoreEnvFile: true,
      asyncEnvVars: [
        async () => ({ ASYNC_ENV_VALIDATED: 'remote' }),
      ],
      validate: config => {
        valueSeenByValidation = config.ASYNC_ENV_VALIDATED;
        return config;
      },
    });

    try {
      expect(valueSeenByValidation).toBe('remote');
      expect(process.env.ASYNC_ENV_VALIDATED).toBe('remote');
    } finally {
      await moduleRef.close();
    }
  });

  it('propagates factory failures', async () => {
    await expect(
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        asyncEnvVars: [
          async () => {
            throw new Error('remote source unavailable');
          },
        ],
      }),
    ).rejects.toThrow('remote source unavailable');
  });

  it('rejects factories that do not resolve to an object', async () => {
    await expect(
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        asyncEnvVars: [async () => null as never],
      }),
    ).rejects.toThrow(
      'Config asyncEnvVars factory must resolve to an object',
    );
  });
});
