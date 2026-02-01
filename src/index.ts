import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import picomatch from 'picomatch';
import { TextTypesOptions } from './types';
import {
  collectFiles,
  generateTsContent,
  generateDts,
  writeIfChanged,
  normalizeLineEndings,
} from './generator';

export type { TextTypesOptions };

export default function textTypes(options: TextTypesOptions): Plugin {
  const {
    include,
    exclude,
    output = 'src/@generated/text-types/index.ts',
    dts,
    keyTransform = {},
    maxLiteralLength = 50_000,
    delimiters = ['{{', '}}'],
  } = options;

  const stripPrefix = keyTransform.stripPrefix;

  let config: ResolvedConfig;
  let isMatch: (p: string) => boolean;

  // Shared logic to generate the output files
  const runGeneration = (root: string) => {
    const files = collectFiles(root, include, exclude, stripPrefix);
    const entries = files.map((f) => {
      const rawContent = fs.readFileSync(f.absPath, 'utf-8');
      const content = normalizeLineEndings(rawContent);
      return { key: f.outKey, content };
    });

    if (output) {
      const tsContent = generateTsContent(entries, maxLiteralLength, delimiters);
      const tsPath = path.resolve(root, output);
      writeIfChanged(tsPath, tsContent);
    }

    if (dts) {
      // For backward compatibility or if they really want a d.ts
      const dtsContent = generateDts('text-types', entries, maxLiteralLength, delimiters);
      const dtsPath = path.resolve(root, dts);
      writeIfChanged(dtsPath, dtsContent);
    }
  };

  return {
    name: 'vite-plugin-text-types',

    configResolved(resolvedConfig) {
      config = resolvedConfig;

      // Pre-compile matcher for HMR
      const normalizePattern = (p: string | string[]) => {
        const arr = Array.isArray(p) ? p : [p];
        return arr.map((item) => (item.startsWith('/') ? item.slice(1) : item));
      };
      isMatch = picomatch(normalizePattern(include), {
        ignore: exclude ? normalizePattern(exclude) : [],
        cwd: config.root,
      });
    },

    buildStart() {
      // Generate on start (dev or build)
      runGeneration(config.root);
    },

    handleHotUpdate(ctx) {
      const relativePath = path.relative(config.root, ctx.file).split(path.sep).join('/');

      if (!isMatch(relativePath)) {
        return;
      }

      runGeneration(config.root);

      // We don't need to return any modules here because the physical .ts file
      // has been updated, and Vite will detect that and trigger HMR for
      // anything that imports it.
      return [];
    },
  };
}
