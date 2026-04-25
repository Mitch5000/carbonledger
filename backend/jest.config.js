module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  passWithNoTests: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
