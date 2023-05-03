import { stat } from "node:fs/promises";
import { isAbsolute, join, parse } from "node:path";
import esbuild from "esbuild";
import { importFresh } from "./import-fresh.js";

/**
 * @typedef {{ exists: boolean, originalPath: string, cwd: string, typescript: boolean, javascript: boolean, path: string }} Resolution
 */

export default class FileUtilities {
  constructor({ development = false, cwd = process.cwd() } = {}) {
    this.development = development;
    this.cwd = cwd;
  }

  /**
   * Given a path with .js extension, resolves a path resolution object
   * Typescript files are detected and converted to js files in dist folder before resolution
   * If both paths resolve, error is thrown
   * If no paths resolve, resolution.exists will be false
   * @param {string} path
   * @returns {Promise<Resolution>}
   */
  async resolve(path) {
    /** @type {Resolution} */
    const resolution = {
      exists: false,
      originalPath: path,
      cwd: this.cwd,
      typescript: false,
      javascript: false,
      path: isAbsolute(path) ? path : join(this.cwd, path),
    };

    // support not specifying .js extension which offers a more intuitive api surface.
    // ie. resolve("./content") will resolve both ts and js files which is more understandable
    // that resolve("./content.js") resolving to a .ts file.
    if (parse(resolution.path).ext === "") resolution.path = resolution.path + ".js";

    const meta = parse(resolution.path);
    const tsPath = join(meta.dir, `${meta.name}.ts`);
    const withTsExtension = meta.ext === ".ts";

    const [statsJs, statsTs] = await Promise.all([stat(resolution.path).catch(() => {}), stat(tsPath).catch(() => {})]);
    if (statsJs && statsTs && !withTsExtension) {
      throw new Error(
        `.ts and .js versions of file exist for file ${resolution.path}. Please use either Typescript OR JavaScript.`
      );
    }

    if (!statsJs && !statsTs) {
      // no files to resolve
      return resolution;
    } else {
      resolution.exists = true;
    }

    if (statsJs) {
      resolution.javascript = true;
      if (statsJs.isDirectory()) {
        throw new Error(`${resolution.path} is a directory, file expected.`);
      }
      if (statsJs.isFile()) {
        return resolution;
      }
    }

    if (statsTs) {
      resolution.typescript = true;
      resolution.path = tsPath;
      if (statsTs.isDirectory()) {
        throw new Error(`${tsPath} is a directory, file expected.`);
      }
      if (statsTs.isFile()) {
        return resolution;
      }
    }

    throw new Error(`Unable to resolve file at path ${path}`);
  }

  /**
   *
   * @param {string} path
   * @returns {Promise<Resolution>} resolution
   */
  async buildAndResolve(path) {
    const resolution = await this.resolve(path);

    if (!resolution.exists) return resolution;

    const outfile = join(this.cwd, "dist", "server", `${parse(path).name}.js`);
    try {
      await esbuild.build({
        entryPoints: [resolution.path],
        bundle: true,
        format: "esm",
        outfile,
        // externalise node_modules
        // can probably do this when we bundle content.js and fallback.js as well
        packages: "external",
        minify: false,
        legalComments: `none`,
        sourcemap: this.development ? "inline" : false,
      });
    } catch (err) {
      throw new Error(`Unable to convert TS file to JS for path ${resolution.path}`);
    }

    resolution.path = outfile;
    return resolution;
  }

  /**
   * Given a path to a .js or .ts file, or a Resolution object, import file.
   * If file is a Typescript file, bundle to dist/server and then import bundled file
   * If file is a JavaScript, simply import it.
   * @param {Resolution | string} path
   * @returns {Promise<any>}
   */
  async import(path) {
    let resolution;
    if (typeof path === "string") {
      resolution = await this.buildAndResolve(path);
    } else {
      resolution = /** @type {Resolution} */ (path);
      resolution = await this.buildAndResolve(resolution.originalPath);
    }
    if (resolution.exists) {
      if (this.development) {
        return importFresh(resolution.path);
      }

      return import(resolution.path);
    }
    throw new Error(`Unable to import file at path ${resolution.path}. File does not exist.`);
  }
}
