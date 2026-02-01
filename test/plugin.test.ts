import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { build } from 'vite';
import textTypes from '../src/index';

describe('vite-plugin-text-types integration', () => {
  const tempDir = path.resolve(__dirname, 'temp-fixture');
  const srcDir = path.join(tempDir, 'src');
  const contentDir = path.join(srcDir, 'content');

  beforeAll(() => {
    fs.mkdirSync(contentDir, { recursive: true });
    fs.writeFileSync(path.join(contentDir, 'hello.md'), '# Hello', 'utf-8');
    fs.writeFileSync(path.join(contentDir, 'foo.txt'), 'Foo Bar', 'utf-8');

    const mainTs = `
      import { texts, getText } from './@generated/text-types'
      console.log(JSON.stringify(texts))
    `;
    fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTs, 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds successfully and generates .ts file', async () => {
    const tsPath = path.join(tempDir, 'src/@generated/text-types/index.ts');

    await build({
      root: tempDir,
      logLevel: 'warn',
      build: {
        lib: {
          entry: path.join(srcDir, 'main.ts'),
          formats: ['es'],
          fileName: 'bundle',
        },
        write: true,
      },
      plugins: [
        textTypes({
          include: '**/*.{md,txt}',
          output: 'src/@generated/text-types/index.ts',
          keyTransform: {
            stripPrefix: '/src/content/',
          },
        }),
      ],
    });

    expect(fs.existsSync(tsPath)).toBe(true);
    const tsContent = fs.readFileSync(tsPath, 'utf-8');
    expect(tsContent).toContain('"hello.md": "# Hello"');
    expect(tsContent).toContain('"foo.txt": "Foo Bar"');
  });

  it('supports custom delimiters', async () => {
    const tsPath = path.join(tempDir, 'src/custom-delims.ts');
    fs.writeFileSync(path.join(contentDir, 'vars.md'), 'Hello {{{ name }}}', 'utf-8');

    await build({
      root: tempDir,
      logLevel: 'warn',
      build: {
        lib: {
          entry: path.join(srcDir, 'main.ts'),
          formats: ['es'],
          fileName: 'bundle-custom',
        },
      },
      plugins: [
        textTypes({
          include: 'src/content/vars.md',
          output: 'src/custom-delims.ts',
          delimiters: ['{{{', '}}}'],
        }),
      ],
    });

    const tsContent = fs.readFileSync(tsPath, 'utf-8');
    expect(tsContent).toContain(
      'type ExtractVars<T extends string> = T extends `${string}{{{${infer Prop}}}}${infer Rest}`',
    );
  });
});
