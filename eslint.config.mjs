import js from "@eslint/js";
import html from "@html-eslint/eslint-plugin"
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    extends: ["html/recommended"],
    language: "html/html",
    rules: {
      "html/no-duplicate-class": "error",
      "html/indent": "off",
      "html/attrs-newline": "off"
    }
  },
]);

/**
 * npm install --save-dev eslint @html-eslint/parser @html-eslint/eslint-plugin @eslint/js
 * 
 * npx eslint <file>
 */