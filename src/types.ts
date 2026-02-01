export interface TextTypesOptions {
  /**
   * Glob(s) of source text files. Recommend project-root-relative globs like 'src/content/*.{md,txt}'.
   */
  include: string | string[];

  /**
   * Glob(s) of files to exclude.
   */
  exclude?: string | string[];

  /**
   * Path to generated .ts file. Default: 'src/@generated/text-types/index.ts'
   */
  output?: string;

  /**
   * Path to generated .d.ts file. Optional.
   * If output is .ts, .d.ts is usually not needed as the .ts file contains types.
   */
  dts?: string | false;

  /**
   * Transform generated keys
   */
  keyTransform?: {
    /**
     * Strip a prefix from the Vite glob key (e.g. '/src/content/' => 'intro.md').
     */
    stripPrefix?: string;
  };

  /**
   * If file content length exceeds this, fall back to `string` to avoid TS performance issues.
   * Default: 50_000
   */
  maxLiteralLength?: number;

  /**
   * Custom variable delimiters. Default: ['{{', '}}']
   */
  delimiters?: [string, string];
}
