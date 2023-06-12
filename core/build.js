import { Config } from "./config.js";
import { Extensions } from "./extensions.js";
import { Files } from "./files.js";
import { Logger } from "./logger.js";
import { Context } from "./context.js";

export class Build {
  #context;

  // override these values if extending Server
  cwd = process.cwd();
  extensionLoadPaths = [process.cwd()];
  development = false;

  async run() {
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
  }
}
