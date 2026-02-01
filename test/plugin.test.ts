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
      import { texts, getText } from 'virtual:text-types'
      console.log(JSON.stringify(texts))
    `;
    fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTs, 'utf-8');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('builds successfully and generates d.ts', async () => {
    const dtsPath = path.join(tempDir, 'src/text-types.d.ts');

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
          dts: 'src/text-types.d.ts',
          keyTransform: {
            stripPrefix: '/src/content/',
          },
        }),
      ],
    });

    expect(fs.existsSync(dtsPath)).toBe(true);
    const dtsContent = fs.readFileSync(dtsPath, 'utf-8');
    expect(dtsContent).toContain('"hello.md": "# Hello"');
    expect(dtsContent).toContain('"foo.txt": "Foo Bar"');
  });

  it('supports custom delimiters', async () => {
    const dtsPath = path.join(tempDir, 'src/custom-delims.d.ts');
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
          dts: 'src/custom-delims.d.ts',
          delimiters: ['{{{', '}}}'],
        }),
      ],
    });

    const dtsContent = fs.readFileSync(dtsPath, 'utf-8');
    expect(dtsContent).toContain(
      'type ExtractVars<T extends string> = T extends `${string}{{{${infer Prop}}}}${infer Rest}`',
    );
  });
});
