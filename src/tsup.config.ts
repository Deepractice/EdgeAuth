import { tsup } from '@deepracticex/config-preset';
import type { Options } from 'tsup';

export default tsup.createConfig({
  entry: [
    'index.ts',
    'core/index.ts',
    'core/crypto/index.ts',
    'core/jwt/index.ts',
    'core/persistence/index.ts',
    'core/mail/index.ts',
    'domain/index.ts',
    'domain/user/index.ts',
    'domain/oauth/index.ts',
    'domain/sso/index.ts',
  ],
  external: [],
}) as Options;
