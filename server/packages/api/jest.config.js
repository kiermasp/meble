/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: true,
          baseUrl: ".",
          paths: {
            "@meble/domain": ["../domain/src/index.ts"],
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@meble/domain$": "<rootDir>/../../domain/src/index.ts",
  },
  testEnvironment: "node",
  testTimeout: 30000,
};
