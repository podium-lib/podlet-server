import PathResolver from "./path.js";

export class Local {
  server = [];
  config = [];
  build = [];
  document = [];
  cwd = "";
  development = false;
  resolver;

  /**
   * @typedef {{ cwd: string, development: boolean }} ResolverOptions
   */

  /**
   * @param {ResolverOptions} options
   */
  constructor({ cwd, development }) {
    this.cwd = cwd;
    this.development = development;
    this.resolver = new PathResolver({ cwd, development });
  }

  static async load({ cwd, development = false }) {
    const local = new Local({ cwd, development });

    await Promise.all([local.loadServer(), local.loadConfig(), local.loadBuild(), local.loadDocument()]);

    return local;
  }

  async loadServer() {
    if ((await this.resolver.resolve("./server")).exists) {
      try {
        // import the file, transpile TS on the fly if necessary
        this.server = [(await this.resolver.import("./server")).default];
      } catch (err) {
        console.error(`server file located but could not be loaded.`, err);
      }
    }
  }

  async loadConfig() {
    if ((await this.resolver.resolve("./config/schema")).exists) {
      try {
        this.config = [(await this.resolver.import("./config/schema")).default];
      } catch (err) {
        console.error(`config/schema file located but could not be loaded.`, err);
      }
    }
  }

  async loadBuild() {
    if ((await this.resolver.resolve("./build")).exists) {
      try {
        this.build = [(await this.resolver.import("./build")).default];
      } catch (err) {
        console.error(`build file located but could not be loaded.`, err);
      }
    }
  }

  async loadDocument() {
    if ((await this.resolver.resolve("./document")).exists) {
      try {
        this.document = [(await this.resolver.import("./document")).default];
      } catch (err) {
        console.error(`document file located but could not be loaded.`, err);
      }
      return this;
    }
  }

  async reload(type) {
    switch (type) {
      case "server":
        return this.loadServer();
      case "config":
        return this.loadConfig();
      case "build":
        return this.loadBuild();
      case "document":
        return this.loadDocument();
      default:
        return Promise.all([this.loadServer(), this.loadConfig(), this.loadBuild(), this.loadDocument()]);
    }
  }
}
