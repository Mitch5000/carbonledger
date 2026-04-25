/**
 * jest.e2e.config.js
 * Jest configuration for end-to-end tests
 */

module.exports = {
  displayName: "e2e",
  testMatch: ["**/*.e2e.spec.ts"],
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.e2e\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/$1",
  },
  testTimeout: 60000, // 60 second timeout for network operations
  globals: {
    "ts-jest": {
      tsconfig: {
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
