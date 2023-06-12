import { EventEmitter } from "events";
import chokidar from "chokidar";

const clientFiles = [
  // "content.js",
  // "content.ts",
  // "fallback.js",
  // "fallback.ts",
  // "scripts.js",
  // "scripts.ts",
  // "lazy.js",
  // "lazy.ts",
  // "client/**/*.js",
  // "client/**/*.ts",
  // "lib/**/*.js",
  // "lib/**/*.ts",
  // "src/**/*.js",
  // "src/**/*.ts",
  // "locales/**/*.po",
];

const serverFiles = [
  "build.js",
  "build.ts",
  // "document.js",
  // "document.ts",
  "server.js",
  "server.ts",
  "server/**/*.js",
  "server/**/*.ts",
  "config/**/*.json",
  "config/schema.js",
  "config/schema.ts",
  // "schemas/**/*.json",
  // "locale/**/*.json",
  // "locales/**/*.po",
];

export class FileWatcher extends EventEmitter {
  #context;

  /**
   * @param {import("./context").Context} context
   */
  constructor(context) {
    super();
    this.#context = context;

    const clientWatcher = chokidar.watch([...clientFiles, ...this.#context.extensions.watchFiles.client], {
      persistent: true,
      followSymlinks: false,
      cwd: this.#context.cwd,
    });

    clientWatcher.on("ready", () => {
      clientWatcher.on("change", this.emit.bind(this, "change:client"));
      clientWatcher.on("add", this.emit.bind(this, "change:client"));
      clientWatcher.on("unlink", this.emit.bind(this, "change:client"));
    });

    clientWatcher.on("error", (err) => {
      // TODO: handle error
    });

    const serverWatcher = chokidar.watch([...serverFiles, ...this.#context.extensions.watchFiles.server], {
      persistent: true,
      followSymlinks: false,
      cwd: this.#context.cwd,
    });

    serverWatcher.on("ready", () => {
      serverWatcher.on("change", this.emit.bind(this, "change:server"));
      serverWatcher.on("add", this.emit.bind(this, "change:server"));
      serverWatcher.on("unlink", this.emit.bind(this, "change:server"));
    });

    serverWatcher.on("error", (err) => {
      // TODO: handle error
    });
  }
}
