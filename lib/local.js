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
    local.server = [(await import(join(path, "server.js"))).default];
    local.config = [(await import(join(path, "config/schema.js"))).default];
    local.build = [(await import(join(path, "build.js"))).default];
    local.document = [(await import(join(path, "document.js"))).default];
    return local;
  }

  async loadServer({ reload = false } = {}) {
    this.server = [(await import(join(this.path, `server.js${reload ? `?t=${Date.now()}` : ""}`))).default];
  }

  async loadConfig({ reload = false } = {}) {
    this.config = [(await import(join(this.path, `config/schema.js${reload ? `?t=${Date.now()}` : ""}`))).default];
  }

  async loadBuild({ reload = false } = {}) {
    this.build = [(await import(join(this.path, `build.js${reload ? `?t=${Date.now()}` : ""}`))).default];
  }

  async loadDocument({ reload = false } = {}) {
    this.document = [(await import(join(this.path, `document.js${reload ? `?t=${Date.now()}` : ""}`))).default];
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
