import { join } from "path";
import { stat, unlink, readFile, writeFile } from "fs/promises";
import esbuild from "esbuild";

export class Files {
  context;
  // content;
  // fallback;
  server;
  build;
  schema;

  files = new Map();

  /**
   * @param {import("./context").Context} context
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * Function that takes a path to a file (without its extension) and then checks for a .ts version
   * and a .js version and if it is a ts file, it compiles it to js and then imports it and if its
   * a .js file, it just imports it.
   * @param {string} path - path to file without file extension
   */
  async importFile(path) {
    const tsPath = `${join(this.context.cwd, path)}.ts`;
    const jsPath = `${join(this.context.cwd, path)}.js`;
    let file;
    let typescript = false;
    try {
      // check if tsPath exists using fs/promises.stat
      typescript = !!(await stat(tsPath));
      if (typescript) {
        await esbuild.build({
          entryPoints: [tsPath],
          bundle: true,
          format: "esm",
          outfile: jsPath,
          // externalise node_modules
          packages: "external",
          minify: false,
          legalComments: `none`,
          sourcemap: this.context.development ? "inline" : false,
        });
      }
    } catch (e) {
      // now we know theres no ts file, so we assume a js file and try to import it
      try {
        if (this.context.development) {
          // if we are in development, we create a unique temp file and import that
          // to break Node's cache and garuntee we get the latest version
          const tmpPath = `${jsPath.replace(".js", "")}${Date.now()}.js`;
          await writeFile(tmpPath, await readFile(jsPath, "utf8"));
          file = await import(tmpPath);
          await unlink(tmpPath);
        } else {
          file = await import(jsPath);
        }
      } catch (e) {
        // no file was found, so we silently return
        return;
      }
    }

    // If we have a typescript file, we need to delete the temporary js file
    if (typescript) {
      await unlink(jsPath);
    }

    return file.default;
  }

  async load() {
    // special reserved files
    this.schema = await this.importFile("./config/schema");
    this.server = await this.importFile("./server");
    this.build = await this.importFile("./build");

    // load all other files defined in extensions
    await Promise.all(
      this.context.extensions.loadFiles.map(async (file) => {
        this.files.set(file, await this.importFile(file));
      })
    );

    // this.build = await this.importFile("./build");
    // this.schema = await this.importFile("./config/schema");
    // this.content = await this.importFile("./content");
    // this.fallback = await this.importFile("./fallback");
  }

  get(file) {
    return this.files.get(file);
  }

  has(file) {
    return this.files.has(file);
  }
}
