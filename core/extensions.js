import { createRequire } from "module";
import { readFile } from "fs/promises";
import { join } from "path";
import merge from "lodash.merge";

/**
 * @typedef {{ server: string[], client: string[] }} WatchFiles
 * @typedef {string[]} LoadFiles
 * @typedef {import("convict").Format} ConfigFormat
 * @typedef {import("convict").Schema<any>} ConfigSchema
 * @typedef {{ schema: ConfigSchema, formats: ConfigFormat[] }} Config
 * @typedef {import("fastify").FastifyPluginAsync} FastifyPlugin
 * @typedef {import("esbuild").Plugin} EsbuildPlugin
 */

/**
 * Container class to hold information about an extension
 */
export class Extension {
  name;
  #options;

  /**
   * @param {string} name
   * @param {{config: Config, build: EsbuildPlugin[], server: FastifyPlugin, watchFiles: WatchFiles, loadFiles: LoadFiles, meta: any}} options
   */
  constructor(name, options) {
    this.name = name;
    this.#options = options;
  }

  get config() {
    return this.#options.config || { schema: {}, formats: [] };
  }

  get build() {
    return this.#options.build;
  }

  get server() {
    return this.#options.server;
  }

  get watchFiles() {
    return this.#options.watchFiles || { server: [], client: [] };
  }

  get loadFiles() {
    return this.#options.loadFiles || [];
  }

  get meta() {
    return this.#options.meta;
  }
}

export class Extensions {
  /**
   * @type {import("./state").State}
   */
  #state;

  /**
   * @type {Map<string, Extension>}
   */
  #extensions = new Map();

  /**
   * @param {import("./state").State} state
   */
  constructor(state) {
    this.#state = state;
  }

  /**
   * Resolve an extension identifier to a specific absolute file path
   *
   * @param {string} identifier eg. `@webtides/extension-foo` or `./extension-foo.js`
   * @param {string} path eg. `/path/to/project/folder`. Essentially like a cwd or base path. Must be an absolute path
   */
  resolveIdentifier(identifier, path) {
    const require = createRequire(join(path, "/"));
    return require.resolve(identifier);
  }

  /**
   * Imports an extension from an absolute file path and assembles it into an object
   *
   * @param {string} file - absolute path to a file to import
   * @returns {Promise<{ server: FastifyPlugin, config: Config, build: EsbuildPlugin[], watchFiles: WatchFiles, loadFiles: LoadFiles, meta: any }>}
   */
  async importExtension(file) {
    const { server, config, build, watchFiles, loadFiles, meta } = await import(file);
    const options = {};
    if (server) {
      options.server = server;
    }
    if (config) {
      options.config = config;
    }
    if (build) {
      options.build = build;
    }
    if (watchFiles) {
      options.watchFiles = /** @type {WatchFiles} */ (watchFiles);
    }
    if (loadFiles) {
      options.loadFiles = /** @type {LoadFiles} */ (loadFiles);
    }
    if (meta) {
      options.meta = meta;
    }
    return options;
  }

  /**
   * for each path, try to read package.json and look for key server.extensions
   * and also look a file called server.json with a key called extensions
   * if found, load the extensions listed
   */
  async load() {
    for (const path of this.#state.extensionLoadPaths) {
      try {
        const packageJson = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
        for (const extension of packageJson.server?.extensions || []) {
          const identifier = this.resolveIdentifier(extension, path);
          const options = await this.importExtension(identifier);
          this.#extensions.set(identifier, new Extension(identifier, options));
        }
      } catch (err) {
        // noop
      }
      try {
        const serverJson = JSON.parse(await readFile(join(path, "server.json"), "utf8"));
        for (const extension of serverJson?.extensions || []) {
          const identifier = this.resolveIdentifier(extension, path);
          const options = await this.importExtension(identifier);
          this.#extensions.set(identifier, new Extension(identifier, options));
        }
      } catch (err) {
        // noop
      }
    }
  }

  // Merges all extensions configs and returns the resulting config object
  // with keys schema and formats
  get config() {
    /** @type {Config} */
    const config = { schema: {}, formats: [] };
    for (const extension of this.#extensions.values()) {
      merge(config.schema, extension.config.schema);
      config.formats = [...config.formats, ...extension.config.formats];
    }
    return config;
  }

  get build() {
    return Array.from(this.#extensions.values())
      .flatMap((extension) => extension.build)
      .filter(Boolean);
  }

  get server() {
    return Array.from(this.#extensions.values())
      .map((extension) => extension.server)
      .filter(Boolean);
  }

  get watchFiles() {
    /** @type {WatchFiles} */
    const watchFiles = { server: [], client: [] };
    for (const extension of this.#extensions.values()) {
      watchFiles.server = [...watchFiles.server, ...extension.watchFiles.server];
      watchFiles.client = [...watchFiles.client, ...extension.watchFiles.client];
    }
    return watchFiles;
  }

  get loadFiles() {
    /** @type {LoadFiles} */
    let loadFiles = [];
    for (const extension of this.#extensions.values()) {
      loadFiles = [...loadFiles, ...extension.loadFiles];
    }
    return loadFiles;
  }

  /**
   * Merge all extensions meta objects and return the resulting object
   */
  get meta() {
    let meta = {};
    const metas = Array.from(this.#extensions.values())
      .map((extension) => extension.meta)
      .filter(Boolean);
    merge(meta, ...metas);
    return meta;
  }
}
