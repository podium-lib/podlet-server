import { Application } from "./application.js";
import { Config } from "./config.js";
import { Extensions } from "./extensions.js";
import { FileWatcher } from "./watcher.js";
import { Files } from "./files.js";
import { Logger } from "./logger.js";
import { Context } from "./context.js";
import { Metrics } from "./metrics.js";

export class Server {
  /**
   * @type {Context}
   */
  #context;

  /**
   * @type {Application}
   */
  application;

  // override these values if extending Server
  cwd = process.cwd();
  extensionLoadPaths = [process.cwd()];
  development = false;

  async start() {
    this.#context = new Context({
      development: this.development,
      cwd: this.cwd,
      extensionLoadPaths: this.extensionLoadPaths,
    });

    this.#context.extensions = new Extensions(this.#context);
    await this.#context.extensions.load();

    this.#context.files = new Files(this.#context);
    await this.#context.files.load();

    this.#context.config = new Config(this.#context);
    await this.#context.config.load();

    this.#context.logger = new Logger(this.#context);

    this.#context.metrics = new Metrics(this.#context);

    this.application = new Application(this.#context);
    await this.application.start();
  }

  async stop() {
    await this.application.stop();
  }

  async restart() {
    await this.stop();
    await this.start();
  }
}

export class DevServer extends Server {
  #context;
  development = true;

  async start() {
    await super.start();

    this.#context.fileWatcher = new FileWatcher(this.#context);
    this.#context.fileWatcher.watch();
    this.#context.fileWatcher.on("change:server", this.restart);
  }
}

export class TestServer extends Server {}
