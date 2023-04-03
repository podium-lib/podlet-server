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
  get server() {
    const server = [];
    if (this.has("core")) {
      for (const s of this.get("core").server || []) {
        server.push(s);
      }
    }
    if (this.has("extensions")) {
      for (const s of this.get("extensions").server || []) {
        server.push(s);
      }
    }
    if (this.has("local")) {
      for (const s of this.get("local").server || []) {
        server.push(s);
      }
    }
    return server;
  }

  get config() {
    const config = [];
    if (this.has("core")) {
      for (const c of this.get("core").config || []) {
        config.push(c);
      }
    }
    if (this.has("extensions")) {
      for (const c of this.get("extensions").config || []) {
        config.push(c);
      }
    }
    if (this.has("local")) {
      for (const c of this.get("local").config || []) {
        config.push(c);
      }
    }
    return config;
  }

  get build() {
    const build = [];
    if (this.has("core")) {
      for (const b of this.get("core").build || []) {
        build.push(b);
      }
    }
    if (this.has("extensions")) {
      for (const b of this.get("extensions").build || []) {
        build.push(b);
      }
    }
    if (this.has("local")) {
      for (const b of this.get("local").build || []) {
        build.push(b);
      }
    }
    return build;
  }

  get document() {
    const document = [];
    if (this.has("core")) {
      for (const d of this.get("core").document || []) {
        document.push(d);
      }
    }
    if (this.has("extensions")) {
      for (const d of this.get("extensions").document || []) {
        document.push(d);
      }
    }
    if (this.has("local")) {
      for (const d of this.get("local").document || []) {
        document.push(d);
      }
    }
    return document;
  }
}
