import fs from "fs/promises";
import path from "path";
import { createRequire } from "node:module";
import Resolution from "./resolution.js";

export class Extensions {
  extensions = new Map();

  static async load({ cwd, development = false }) {
    const exts = new Extensions();
    // read package.json file from cwd, read it and parse it using JSON.parse
    let packageJson;
    try {
      packageJson = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf8"));
    } catch (err) {
      return exts; // no package.json file found or bad json, so no extensions to load
    }
    const require = createRequire(path.join(cwd, "/"));
    const extensions = packageJson.podium?.extensions?.["podlet-server"] || [];
    for (const extension of extensions) {
      const dependency = await import(require.resolve(extension));
      const options = {};
      if (dependency.server) {
        options.server = dependency.server;
      }
      if (dependency.config) {
        options.config = dependency.config;
      }
      if (dependency.build) {
        options.build = dependency.build;
      }
      if (dependency.document) {
        options.document = dependency.document;
      }
      exts.extensions.set(extension, new Resolution(options, { name: extension }));
    }

    return exts;
  }

  [Symbol.iterator]() {
    return this.extensions.values();
  }

  get config() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.config)
      .filter(Boolean);
  }

  get build() {
    return Array.from(this.extensions.values())
      .flatMap((extension) => extension.build)
      .filter(Boolean);
  }

  get document() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.document)
      .filter(Boolean);
  }

  get server() {
    return Array.from(this.extensions.values())
      .map((extension) => extension.server)
      .filter(Boolean);
  }
}
