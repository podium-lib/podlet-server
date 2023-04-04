import { join } from "path";
import PathResolver from "./path.js";

export class Local {
  server = [];
  config = [];
  build = [];
  document = [];
  cwd = "";
  development = false;
  resolver;

  static async load({ cwd, development = false }) {
    const local = new Local();
    local.cwd = cwd;
    local.development = development;
    local.resolver = new PathResolver({ cwd, development });

    try {
      local.server = [(await local.resolver.import(join(cwd, "server.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.config = [(await local.resolver.import(join(cwd, "config/schema.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.build = [(await local.resolver.import(join(cwd, "build.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.document = [(await local.resolver.import(join(cwd, "document.js"))).default];
    } catch (e) {
      /* ignore */
    }
    return local;
  }

  async loadServer({ reload = false } = {}) {
    try {
      this.server = [
        (await this.resolver.import(join(this.cwd, `server.js${reload ? `?t=${Date.now()}` : ""}`))).default,
      ];
    } catch (e) {
      /* ignore */
    }
  }

  async loadConfig({ reload = false } = {}) {
    try {
      this.config = [
        (await this.resolver.import(join(this.cwd, `config/schema.js${reload ? `?t=${Date.now()}` : ""}`))).default,
      ];
    } catch (e) {
      /* ignore */
    }
  }

  async loadBuild({ reload = false } = {}) {
    try {
      this.build = [
        (await this.resolver.import(join(this.cwd, `build.js${reload ? `?t=${Date.now()}` : ""}`))).default,
      ];
    } catch (e) {
      /* ignore */
    }
  }

  async loadDocument({ reload = false } = {}) {
    try {
      this.document = [
        (await this.resolver.import(join(this.cwd, `document.js${reload ? `?t=${Date.now()}` : ""}`))).default,
      ];
    } catch (e) {
      /* ignore */
    }
  }

  async reload(type) {
    switch (type) {
      case "server":
        return this.loadServer({ reload: true });
      case "config":
        return this.loadConfig({ reload: true });
      case "build":
        return this.loadBuild({ reload: true });
      case "document":
        return this.loadDocument({ reload: true });
      default:
        return Promise.all([
          this.loadServer({ reload: true }),
          this.loadConfig({ reload: true }),
          this.loadBuild({ reload: true }),
          this.loadDocument({ reload: true }),
        ]);
    }
  }
}
