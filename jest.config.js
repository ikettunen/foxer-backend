module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  globals: {
    'ts-jest': {
      diagnostics: {
        // Ignore pre-existing TS errors in src files not related to our tests
        ignoreCodes: [2769, 2550],
      },
    },
  },
}
