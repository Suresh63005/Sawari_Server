import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
    rules: {
      // Disallow 'var', use 'let' or 'const' instead
      "no-var": "error",

      // Enforce 'const' for variables that are never reassigned
      "prefer-const": "error",

      // Disallow undeclared variables
      "no-undef": "error",

      // Enforce double quotes for strings
      "quotes": ["error", "double"],

      // Enforce consistent indentation (2 spaces)
      "indent": ["error", 2],

      // Warn when using console methods
      "no-console": "warn",

      // Disallow trailing spaces at the end of lines
      "no-trailing-spaces": "error",

      // Disallow empty functions (e.g., function() {})
      "no-empty-function": "error",

      // Optional: Enforce strict mode for CommonJS files
      "strict": ["error", "global"],  // Ensure strict mode is enabled in all files

      // Optional: Enforce consistent line breaks between class members (if using classes)
      "lines-between-class-members": ["error", "always"]
    }
  },
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: {
      // Strict mode enforcement for CommonJS files
      "strict": ["error", "global"]
    }
  }
]);
