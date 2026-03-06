import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '../../lib';
import { AppModule } from '../src/app.module';

describe('Environment variables', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule.withAsyncEnvVars()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it(`should return loaded async env variables`, async () => {
    await ConfigModule.envVariablesLoaded;

    const envVars = app.get(AppModule).getAsyncConfig();
    expect(envVars).toEqual('true');
  });

  afterEach(async () => {
    await app.close();
  });
});
