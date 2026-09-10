import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  testEnvironment: 'node',
};
export default config;
