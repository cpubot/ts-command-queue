module.exports = {
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*(\\.|/)(test|spec))\\.(js|ts)$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupTestFrameworkScriptFile: './jest.setup.ts',
  modulePaths: ['<rootDir>/src/'],
  modulePathIgnorePatterns: ['dist'],
};
