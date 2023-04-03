import fs from "fs/promises";
import path from "path";
import { createRequire } from "node:module";
import Extension from "./extension.js";

export class Extensions {
  extensions = new Map();

  static async load(dirPath) {
    const exts = new Extensions();
    // read package.json file from cwd, read it and parse it using JSON.parse
    let packageJson;
    try {
      packageJson = JSON.parse(await fs.readFile(path.join(dirPath, "package.json"), "utf8"));
    } catch (err) {
      return exts; // no package.json file found or bad json, so no extensions to load
    }
    const require = createRequire(path.join(dirPath, "/"));
    const extensions = packageJson.podium?.extensions?.["podlet-server"];

    for (const extension of extensions) {
      const dependency = await import(require.resolve(extension));
      exts.extensions.set(extension, new Extension(dependency, { name: extension }));
    }

    return exts;
  }

  config() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.config)
      .filter(Boolean);
  }

  build() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.build)
      .filter(Boolean);
  }

  document() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.document)
      .filter(Boolean);
  }

  server() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.server)
      .filter(Boolean);
  }
}
