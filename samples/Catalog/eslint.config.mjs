import simpleImportSort from "eslint-plugin-simple-import-sort";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["./android", "./ios", "./assets", "./node_modules/**/*.js"],
}, ...compat.extends("@react-native"), {
    plugins: {
        "simple-import-sort": simpleImportSort,
    },

    rules: {
        "react/no-string-refs": "off",
        "no-alert": "off",
        "react-native/no-inline-styles": "off",
        "simple-import-sort/imports": "error",
    },
}];