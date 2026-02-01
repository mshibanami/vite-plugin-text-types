import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import picomatch from 'picomatch';
import { TextTypesOptions } from './types';
import { collectFiles, generateDts, writeIfChanged, normalizeLineEndings } from './generator';

export type { TextTypesOptions };

export default function textTypes(options: TextTypesOptions): Plugin {
  const {
    include,
    exclude,
    virtualModuleId = 'virtual:text-types',
    dts = 'src/text-types.d.ts',
    query = '?raw',
    import: importClause = 'default',
    eager = true,
    keyTransform = {},
    maxLiteralLength = 50_000,
    delimiters = ['{{', '}}'],
  } = options;

  if (eager === false) {
    throw new Error(
      '[vite-plugin-text-types] eager: false is currently not supported. The plugin requires eager: true to generate type-safe string literals.',
    );
  }

  const stripPrefix = keyTransform.stripPrefix;
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  let config: ResolvedConfig;
  let isMatch: (p: string) => boolean;

  // Shared logic to generate the d.ts file
  const runGeneration = (root: string) => {
    if (!dts) return;

    const files = collectFiles(root, include, exclude, stripPrefix);
    const entries = files.map((f) => {
      const rawContent = fs.readFileSync(f.absPath, 'utf-8');
      const content = normalizeLineEndings(rawContent);
      return { key: f.outKey, content };
    });

    const dtsContent = generateDts(virtualModuleId, entries, maxLiteralLength, delimiters);
    const dtsPath = path.resolve(root, dts);
    writeIfChanged(dtsPath, dtsContent);
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

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        // Construct the runtime module
        const importOptions = {
          eager,
          query,
          import: importClause,
        };

        const globStr = JSON.stringify(importOptions);

        // Generate separate import.meta.glob lines for each pattern
        // Then merge them.
        // Example:
        // const m0 = import.meta.glob('/src/*.md', { eager: true, ... })
        // const modules = { ...m0 }

        // Resolve patterns to root-relative paths for import.meta.glob
        const toRootRelative = (p: string) => {
          // Check if it's an absolute file system path
          if (path.isAbsolute(p)) {
            const rel = path.relative(config.root, p);
            return '/' + rel.split(path.sep).join('/');
          }
          // Treat as relative to root, ensure it starts with /
          const normalized = p.split(path.sep).join('/');
          if (normalized.startsWith('/')) return normalized;
          return '/' + normalized;
        };

        const includePatterns = (Array.isArray(include) ? include : [include]).map(toRootRelative);
        const excludePatterns = (exclude ? (Array.isArray(exclude) ? exclude : [exclude]) : []).map(
          (p) => '!' + toRootRelative(p),
        );

        const allPatterns = [...includePatterns, ...excludePatterns];

        const lines: string[] = [];
        lines.push(`const modules = {}`);

        // Use a single import.meta.glob with all patterns (includes and negated excludes)
        lines.push(
          `Object.assign(modules, import.meta.glob(${JSON.stringify(allPatterns)}, ${globStr}))`,
        );

        lines.push(`const stripPrefix = (k) => {`);
        if (stripPrefix) {
          const p = stripPrefix;
          lines.push(`  const p = ${JSON.stringify(p)}`);
          lines.push(`  if (k.startsWith(p)) return k.slice(p.length)`);
          if (!p.startsWith('/')) {
            lines.push(`  if (k.startsWith('/' + p)) return k.slice(p.length + 1)`);
          }
          lines.push(`  return k`);
        } else {
          lines.push(`  return k`);
        }
        lines.push(`}`);

        lines.push(`export const texts = Object.fromEntries(`);
        lines.push(`  Object.entries(modules).map(([k, v]) => [stripPrefix(k), v])`);
        lines.push(`)`);

        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = `${escapeRegex(delimiters[0])}([\\s\\S]+?)${escapeRegex(delimiters[1])}`;

        lines.push(`export function getText(id, args) {`);
        lines.push(`  const t = texts[id]`);
        lines.push(`  if (typeof t !== 'string' || !args) return t`);
        lines.push(`  return t.replace(new RegExp(${JSON.stringify(pattern)}, 'g'), (_, key) => {`);
        lines.push(`    const val = args[key.trim()]`);
        lines.push(
          `    return val !== undefined ? val : ${JSON.stringify(delimiters[0])} + key + ${JSON.stringify(delimiters[1])}`,
        );
        lines.push(`  })`);
        lines.push(`}`);

        return lines.join('\n');
      }
    },

    handleHotUpdate(ctx) {
      const relativePath = path.relative(config.root, ctx.file).split(path.sep).join('/');

      if (!isMatch(relativePath)) {
        return;
      }
      runGeneration(config.root);
      const mod = ctx.server.moduleGraph.getModuleById(resolvedVirtualModuleId);
      if (mod) {
        ctx.server.moduleGraph.invalidateModule(mod);
        return [mod];
      } else {
        ctx.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}
