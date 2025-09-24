import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-var": "error",  //  use only 'let' or 'const' instead of 'var'
      "prefer-const": "error",  // Encourages 'const' for immutable variables
      "no-undef": "error",  // Industry standard: prevent use of undeclared variables
      // "quotes": ["error", "double"],  // Use single quotes for strings, e.g., 'string'
      // "indent": ["error", 2],  // 2-space indentation is industry standard
      // "no-console": "warn",  // Warn when console methods are used (can be disabled for production code)
      // "no-trailing-spaces": "error", // Remove trailing spaces from lines         // Enforce no leading or trailing whitespace
      "no-empty-function": "error", // Disallow empty functions
    }
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  }
]);
