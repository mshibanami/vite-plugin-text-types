# vite-plugin-text-types

[![Test](https://github.com/mshibanami/vite-plugin-text-types/actions/workflows/test.yml/badge.svg)](https://github.com/mshibanami/vite-plugin-text-types/actions/workflows/test.yml)
[![NPM version](https://img.shields.io/npm/v/vite-plugin-text-types.svg?style=flat)](https://www.npmjs.org/package/vite-plugin-text-types)

A Vite plugin that generates TypeScript definitions (string literal types) for your text assets (Markdown, txt, etc.).

## What problem does this solve?

Suppose you want a Markdown text, which is generated with a Markdown template and variables.
The easiest way is to use string replacement like this:

```ts
const text = "Hello, {{name}}!";
const name = "John";
const output = text.replace("{{name}}", name); // 'Hello, John!'
```

But this is not type-safe.

Another solution is to use Template Literal Types, Conditional Types, and `infer`, like this:

```ts
const text = "Hello, {{ name }}!" as const;

type ExtractVarNames<T extends string> =
  T extends `${string}{{${infer Key}}}${infer Rest}`
    ? Key | ExtractVarNames<Rest>
    : never;

type TextParams = Record<ExtractVarNames<typeof text>, string>;

const getText = (params: TextParams): string => {
  let result: string = text;
  (Object.keys(params) as (keyof TextParams)[]).forEach((key) => {
    const value = params[key];
    result = result.split(`{{${key}}}`).join(value);
  });
  return result;
};

const output = getText({ name: "John" }); // 'Hello, John!'
```

This is type-safe, but works only when it's hard-coded with `as const`.
Maintaining Markdown text written in JavaScript/TypeScript is problematic since you can't use formatters, syntax highlighting, or other tools.

vite-plugin-text-types allows you to write text files (e.g., Markdown) normally, and then it copies them with proper TypeScript definitions when you run `vite build`.

> [!WARNING]
>
> In other words, this plugin put all the text content into TypeScript types. Please be aware especially when you have large text files.

## Installation

```bash
npm install -D vite-plugin-text-types
```

## Usage

### 1. Add to `vite.config.ts`

```ts
import { defineConfig } from "vite";
import textTypes from "vite-plugin-text-types";

export default defineConfig({
  plugins: [
    textTypes({
      // Glob pattern(s) to include
      include: "**/*.{md,txt}",

      // Optional: transformer to clean up keys
      keyTransform: {
        stripPrefix: "/src/content/",
      },
    }),
  ],
});
```

Check [Configuration Options](#configuration-options) for more details about the options.

Check the [example](example) folder for a complete example.

### 2. Import in your code

```ts
import { texts, getText } from "virtual:text-types";

// 1. Direct access via 'texts'
console.log(texts["intro.txt"]); // Typed as the actual content of intro.txt

// 2. Dynamic content with type-safe variables
// If intro.txt contains "Hello {{ name }}!"
const greeting = getText("intro.txt", { name: "John" });
// ^ TypeScript will enforce that 'name' is required and is a string|number.

// Types are generated automatically in src/text-types.d.ts
type IntroContent = (typeof texts)["intro.txt"]; // e.g. "Hello, John!"

> [!TIP]
> It is recommended to add the generated `text-types.d.ts` file to your `.gitignore`.

```

The most powerful feature of this plugin is the ability to handle variables within your text files. The plugin will generate a `getText` signature that knows exactly which variables are required.

Variables are identified by the `{{ key }}` syntax by default. You can customize the delimiters using the `delimiters` option (e.g., `['{{{', '}}}']`). Leading and trailing spaces inside the delimiters are ignored.

## Configuration Options

| Option                     | Type                  | Default                 | Description                                                                                          |
| -------------------------- | --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `include`                  | `string \| string[]`  | **Required**            | Glob pattern(s) for files to include. Recommend project-root-relative globs like `src/content/*.md`. |
| `exclude`                  | `string \| string[]`  | `undefined`             | Glob pattern(s) to exclude.                                                                          |
| `keyTransform.stripPrefix` | `string`              | `undefined`             | String to strip from the start of the generated keys.                                                |
| `dts`                      | `string \| false`     | `'src/text-types.d.ts'` | Path to the generated `.d.ts` file. Set `false` to disable.                                          |
| `virtualModuleId`          | `string`              | `'virtual:text-types'`  | ID for the virtual module.                                                                           |
| `maxLiteralLength`         | `number`              | `50_000`                | Max length for a string literal type. Larger files fall back to `string`.                            |
| `delimiters`               | `[string, string]`    | `['{{', '}}']`          | Custom variable delimiters.                                                                          |
| `query`                    | `string`              | `'?raw'`                | The query string used for `import.meta.glob`.                                                        |
| `import`                   | `'default' \| string` | `'default'`             | The import clause used for `import.meta.glob`.                                                       |
| `eager`                    | `boolean`             | `true`                  | Whether to use eager loading for `import.meta.glob`.                                                 |

## License

[MIT License](LICENSE)
