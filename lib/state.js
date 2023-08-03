import convict from "convict";
// Step 1.
// podlet-server
// - config = yes
// - build plugins = no
// - server plugins = yes
// - document template = no
// - etc

// Step 2.
// extensions
//     - config
//     - build plugins
//     - server plugins
//     - document template
//     - etc

// Step 3.
// local app
//     - config
//     - build plugins
//     - server plugins
//     - document template
//     - etc

// const state = new State();

// // same interface of .server, .config, .build, .document etc
// const core = await Core.load(path);
// const extensions = await Extensions.load(path);
// const local = await Local.load();

// state.set("core", core)
// state.set("extensions", extensions)
// state.set("local", local)

// files.change(() => {
//     const local = await local.reload();
//     state.set("local", local);
// })

// somewhere else
// state.server
// state.config
// state.build
// state.document

export class State extends Map {
  cwd;
  development;

  constructor({ cwd, development = false }) {
    super();
    this.cwd = cwd;
    this.development = development;
  }

  async server() {
    const serverPlugins = [];
    if (this.has("core")) {
      serverPlugins.push(this.get("core").server);
    }
    if (this.has("extensions")) {
      for (const serverPlugin of this.get("extensions").server) {
        serverPlugins.push(serverPlugin);
      }
    }
    if (this.has("local") && this.get("local").server) {
      serverPlugins.push(this.get("local").server);
    }
    return serverPlugins;
  }

  async config() {
    const schemas = [];
    if (this.has("core")) {
      schemas.push(await this.get("core").config());
    }
    if (this.has("extensions")) {
      for (const extensionConfig of this.get("extensions").config) {
        const schema = await extensionConfig({ cwd: this.cwd, development: this.development, convict });
        if (schema) {
          schemas.push(schema);
        }
      }
    }
    if (this.has("local") && typeof this.get("local").config === "function") {
      schemas.push(await this.get("local").config({ cwd: this.cwd, development: this.development }));
    }
    return schemas;
  }

  async build(config) {
    const buildPlugins = [];
    if (this.has("extensions")) {
      for (const buildFunction of this.get("extensions").build) {
        buildPlugins.push(...(await buildFunction({ cwd: this.cwd, development: this.development, config })))
      }
    }
    if (this.has("local") && typeof this.get("local").build === "function") {
      buildPlugins.push(...(await this.get("local").build({ cwd: this.cwd, development: this.development, config })));
    }
    return buildPlugins;
  }

  async document() {
    const documentTemplates = [];
    if (this.has("extensions")) {
      for (const documentTemplate of this.get("extensions").document) {
        documentTemplates.push(documentTemplate);
      }
    }
    if (this.has("local") && this.get("local").document) {
      documentTemplates.push(this.get("local").document);
    }
    return documentTemplates;
  }
}
