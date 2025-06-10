module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  transformIgnorePatterns: [
    "/node_modules/(?!express|path-to-regexp|router)/"
  ],
  // Optional: Ignore certain files from coverage analysis
  // coveragePathIgnorePatterns: [
  //   "/node_modules/",
  //   "/models/", // Might want to test models separately or include if logic exists
  //   "/mediaScanner.js" // If it's mostly fs operations, direct unit tests might be complex
  // ],
  // Force Jest to exit after tests have completed, can help with open handles if --detectOpenHandles isn't enough
  // forceExit: true,
};
