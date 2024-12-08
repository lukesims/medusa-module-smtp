/** @type {import('jest').Config} */
export default {
  moduleFileExtensions: ["js", "ts"],
  moduleNameMapper: { "^~/": "<rootDir>/src" },
  modulePathIgnorePatterns: ["dist/"],
  setupFiles: ["dotenv/config"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["dist/", "node_modules/"],
  transformIgnorePatterns: ["node_modules/"],

  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        sourceMaps: "inline",
        jsc: {
          target: "ES2021",
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            useDefineForClassFields: false,
            legacyDecorator: true,
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
};
