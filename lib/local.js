import { join } from "path";

export class Local {
  server = [];
  config = [];
  build = [];
  document = [];
  path = "";

  static async load(path) {
    const local = new Local();
    local.path = path;
    try {
      local.server = [(await import(join(path, "server.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.config = [(await import(join(path, "config/schema.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.build = [(await import(join(path, "build.js"))).default];
    } catch (e) {
      /* ignore */
    }
    try {
      local.document = [(await import(join(path, "document.js"))).default];
    } catch (e) {
      /* ignore */
    }
    return local;
  }

  async loadServer({ reload = false } = {}) {
    try {
      this.server = [(await import(join(this.path, `server.js${reload ? `?t=${Date.now()}` : ""}`))).default];
    } catch (e) {
      /* ignore */
    }
  }

  async loadConfig({ reload = false } = {}) {
    try {
      this.config = [(await import(join(this.path, `config/schema.js${reload ? `?t=${Date.now()}` : ""}`))).default];
    } catch (e) {
      /* ignore */
    }
  }

  async loadBuild({ reload = false } = {}) {
    try {
      this.build = [(await import(join(this.path, `build.js${reload ? `?t=${Date.now()}` : ""}`))).default];
    } catch (e) {
      /* ignore */
    }
  }

  async loadDocument({ reload = false } = {}) {
    try {
      this.document = [(await import(join(this.path, `document.js${reload ? `?t=${Date.now()}` : ""}`))).default];
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
