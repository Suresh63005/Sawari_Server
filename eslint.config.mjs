// Import necessary modules from ESLint and other packages.
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
// Import the boundaries plugin. Make sure you have installed it (`npm install --save-dev eslint-plugin-boundaries`).
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";

// Export the ESLint configuration using defineConfig for type safety.
export default defineConfig([
  // This object replaces the deprecated .eslintignore file.
  // It tells ESLint to ignore the node_modules directory.
  {
    ignores: ["node_modules/"],
  },
  {
    // Apply this configuration to all JavaScript-related files.
    files: ["**/*.{js,mjs,cjs}"],
    // Register the plugins to be used.
    // 'js' is for the recommended JavaScript rules.
    // 'boundaries' is for the element-types rule you want to use.
    plugins: { js, boundaries },
    // Extend the recommended ESLint JavaScript rules.
    extends: ["js/recommended", prettier],
    languageOptions: {
      // Define global variables available in the environment.
      globals: {
        // Use Node.js global variables.
        ...globals.node,
        // Add Jest globals (this prevents 'no-undef' errors for Jest functions)
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        describe: "readonly",
      },
    },

    // Define specific rules and their severity levels.
    rules: {
      // Rule from eslint-plugin-boundaries to enforce architectural constraints.
      "boundaries/element-types": [
        "error",
        {
          default: "disallow", // By default, disallow imports between different element types.
          rules: [
            // Define specific allowances.
            { from: ["controller"], allow: ["service", "utils", "helper"] },
            { from: ["routes"], allow: ["controller", "validators"] },
            { from: ["service"], allow: ["models", "utils"] },
          ],
        },
      ],

      // Your existing standard JavaScript rules.
      "no-var": "error", // ❌ Disallow 'var', only let & const
      // "prefer-const": "error",
      "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
      quotes: ["error", "double", { avoidEscape: true }], // ❌ Enforce double quotes
      "no-multi-spaces": "error", // ❌ Disallow double spaces
      semi: ["error", "always"], // ✅ Require semicolons
      // "no-console": "warn", // 🔔 Avoid leaving console.log
      "no-empty-function": "error", // Disallow empty functions
      "no-implicit-globals": "error", // Disallow implicit global variable declarations
      "no-duplicate-imports": "error", // Disallow duplicate imports
    },
  },
  {
    // Specific configuration for .js files.
    files: ["**/*.js"],
    languageOptions: {
      // Treat .js files as CommonJS modules.
      sourceType: "commonjs",
    },
  },
]);
