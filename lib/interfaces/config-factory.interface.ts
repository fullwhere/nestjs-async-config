import { ConfigObject } from '../types';

type ConfigFactoryReturnValue<T extends ConfigObject> = T | Promise<T>;

export type ConfigFactory<T extends ConfigObject = ConfigObject> =
  () => ConfigFactoryReturnValue<T>;

export type AsyncConfigFactory<T extends ConfigObject = ConfigObject> =
  () => Promise<T>;
