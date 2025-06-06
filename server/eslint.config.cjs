// eslint.config.cjs
const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"], // Apply these rules to all JS files
    languageOptions: {
      ecmaVersion: 12,
      sourceType: "commonjs",
      globals: {
        ...globals.node, // Defines Node.js global variables.
        // ...globals.es2021, // es2021 globals are mostly covered by ecmaVersion: 12 or node env
      }
    },
    rules: {
      "no-console": "off",
      "indent": ["error", 2],
      "linebreak-style": ["error", "unix"],
      "quotes": ["error", "single", { "avoidEscape": true }],
      "semi": ["error", "always"],
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^([_e]|err|error|req|res|next)$" }] // More permissive for common callback args
    }
  }
];
