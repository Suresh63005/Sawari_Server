// import js from "@eslint/js";
// import globals from "globals";
// import { defineConfig } from "eslint/config";

// export default defineConfig([
//   {
//     files: ["**/*.{js,mjs,cjs}"],
//     plugins: { js },
//     extends: ["js/recommended"],
//     languageOptions: {

//       globals: {
//         ...globals.node

//       }
//     },

//     rules: {
//       "boundaries/element-types": [
//         "error",
//         {
//           default: "disallow",
//           rules: [
//             { from: ["controller"], allow: ["service", "utils", "helper"] },
//             { from: ["routes"], allow: ["controller", "validators"] },
//             { from: ["service"], allow: ["models", "utils"] },
//           ],
//         },
//       ],
//       // "no-var": "error",  //  use only 'let' or 'const' instead of 'var'
//       // "prefer-const": "error",  // Encourages 'const' for immutable variables
//       // "no-undef": "error",  // Industry standard: prevent use of undeclared variables
//       // // "quotes": ["error", "double"],  // Use single quotes for strings, e.g., 'string'
//       // // "indent": ["error", 2],  // 2-space indentation is industry standard
//       // // "no-console": "warn",  // Warn when console methods are used (can be disabled for production code)
//       // // "no-trailing-spaces": "error", // Remove trailing spaces from lines         // Enforce no leading or trailing whitespace
//       // "no-empty-function": "error", // Disallow empty functions

//       "no-var": "error", // ❌ Disallow 'var', only let & const
//       quotes: ["error", "double", { avoidEscape: true }], // ❌ Enforce double quotes
//       "no-multi-spaces": "error", // ❌ Disallow double spaces
//       semi: ["error", "always"], // ✅ Require semicolons
//       "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }], // Unused vars error
//       "no-console": "warn", // 🔔 Avoid leaving console.log
//     }
//   },
//   {
//     files: ["**/*.js"],
//     languageOptions: { sourceType: "commonjs" },
//   }
// ]);


// Import necessary modules from ESLint and other packages.
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
// Import the boundaries plugin. Make sure you have installed it (`npm install --save-dev eslint-plugin-boundaries`).
import boundaries from "eslint-plugin-boundaries";

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
    extends: ["js/recommended"],
    languageOptions: {
      // Define global variables available in the environment.
      globals: {
        // Use Node.js global variables.
        ...globals.node,
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
      "prefer-const": "error",
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