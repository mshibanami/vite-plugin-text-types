import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { collectFiles, generateDts, writeIfChanged } from '../src/generator';

describe('collectFiles', () => {
  it('correctly collects and transforms file paths', () => {
    vi.mock('fast-glob', () => ({
      default: {
        sync: (patterns: string[], opts: any) => {
          return [
            path.normalize('/root/src/content/intro.md'),
            path.normalize('/root/src/content/about.md'),
          ];
        },
      },
    }));

    const root = path.normalize('/root');
    const result = collectFiles(root, '/src/content/*.md', undefined, '/src/content/');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      absPath: path.normalize('/root/src/content/about.md'),
      viteKey: '/src/content/about.md',
      outKey: 'about.md',
    });
    expect(result[1]).toEqual({
      absPath: path.normalize('/root/src/content/intro.md'),
      viteKey: '/src/content/intro.md',
      outKey: 'intro.md',
    });
  });
});

describe('generateDts', () => {
  it('generates d.ts with string literal types', () => {
    const entries = [
      { key: 'hello.md', content: 'Hello, John!' },
      { key: 'quoted.md', content: 'Say "Hello"\'s' },
    ];
    const dts = generateDts('virtual:my-texts', entries);

    expect(dts).toContain(`declare module 'virtual:my-texts'`);
    expect(dts).toContain(`"hello.md": "Hello, John!"`);
    expect(dts).toContain(`"quoted.md": "Say \\"Hello\\"'s"`);
  });

  it('falls back to string for long content', () => {
    const entries = [
      { key: 'short.md', content: 'short' },
      { key: 'long.md', content: 'a'.repeat(100) },
    ];
    const dts = generateDts('virtual:my-texts', entries, 50);

    expect(dts).toContain(`"short.md": "short"`);
    expect(dts).toContain(`"long.md": string`);
  });

  it('generates d.ts with custom delimiters', () => {
    const entries = [{ key: 'hello.md', content: 'Hello, {{{ name }}}!' }];
    const dts = generateDts('virtual:my-texts', entries, 50_000, ['{{{', '}}}']);

    expect(dts).toContain(
      'type ExtractVars<T extends string> = T extends `${string}{{{${infer Prop}}}}${infer Rest}`',
    );
  });
});

describe('writeIfChanged', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes if file does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    const changed = writeIfChanged('/path/to/file', 'content');
    expect(changed).toBe(true);
    expect(writeSpy).toHaveBeenCalledWith('/path/to/file', 'content', 'utf-8');
  });

  it('does not write if content is identical', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('content');
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    const changed = writeIfChanged('/path/to/file', 'content');
    expect(changed).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('writes if content is different', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('old content');
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    const changed = writeIfChanged('/path/to/file', 'new content');
    expect(changed).toBe(true);
    expect(writeSpy).toHaveBeenCalledWith('/path/to/file', 'new content', 'utf-8');
  });
});
