import { Application } from "./application.js";
import { Config } from "./config.js";
import { Extensions } from "./extensions.js";
import { FileWatcher } from "./watcher.js";
import { Files } from "./files.js";
import { Logger } from "./logger.js";
import { State } from "./state.js";

export class Server {
  #state;
  application;
  
  // override these values if extending Server
  cwd = process.cwd();
  extensionLoadPaths = [process.cwd()];
  development = false;
  
  async start() {
    this.#state = new State({ development: this.development, cwd: this.cwd, extensionLoadPaths: this.extensionLoadPaths });

    this.#state.extensions = new Extensions(this.#state);
    await this.#state.extensions.load();

    this.#state.files = new Files(this.#state);
    await this.#state.files.load();

    this.#state.config = new Config(this.#state);
    await this.#state.config.load();

    this.#state.logger = new Logger(this.#state);

    this.application = new Application(this.#state);
    await this.application.start();
  }

  async stop() {
    await this.application.close();
  }

  async restart() {
    await this.stop();
    await this.start();
  }
}

export class DevServer extends Server {
  #state;
  development = true;

  async start() {
    await super.start();

    this.#state.fileWatcher = new FileWatcher(this.#state);
    this.#state.fileWatcher.watch();
    this.#state.fileWatcher.on("change:server", this.restart);
  }
}

export class TestServer extends Server {}
