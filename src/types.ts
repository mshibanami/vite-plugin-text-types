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
   * Virtual module ID. Default: 'virtual:text-types'
   */
  virtualModuleId?: string;

  /**
   * Path to generated d.ts file. Default: 'src/text-types.d.ts'. Set false to disable.
   */
  dts?: string | false;

  /**
   * import.meta.glob query (raw import). Default: '?raw'
   */
  query?: string;

  /**
   * import.meta.glob import name. Default: 'default'
   */
  import?: 'default' | string;

  /**
   * import.meta.glob eager option. Default: true (v1 can hardcode true)
   */
  eager?: boolean;

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
