import { EventEmitter } from "node:events";

class Server {
  #state;
  constructor() {
    this.#state = new State({ development: false });
  }
  async provision() {
    new Logger(this.#state);
    new Extensions(this.#state);
    new Files(this.#state);
    new Config(this.#state);
  }
  async start() {
    await this.provision();
  }
}

class DevServer extends Server {
  #state;
  constructor() {
    super();
    this.#state = new State({ development: true });
  }
  async provision() {
    new FileWatcher(this.#state);
    return super.provision();
  }
  restart() {}
}

/**
 * Wrapper logger that can switch between raw dev mode cli output and standard fastify pino logger output
 */
class Logger {
  #state;
  #log;
  constructor(state) {
    this.#state = state;
    if (this.#state.development) {
      this.#log = pino({
        transport: {
          target: "../lib/pino-dev-transport.js",
        },
        // @ts-ignore
        level: config.get("app.logLevel").toLowerCase(),
      });
    } else {
      this.#log = pino({
        // @ts-ignore
        level: config.get("app.logLevel").toLowerCase(),
      });
    }
  }
  info() {
    this.#log.info(...arguments);
  }
  error() {
    this.#log.error(...arguments);
  }
  warn() {
    this.#log.warn(...arguments);
  }
  debug() {
    this.#log.debug(...arguments);
  }
  trace() {
    this.#log.trace(...arguments);
  }
  fatal() {
    this.#log.fatal(...arguments);
  }
}

/**
 * Wrapper around server components that can be passed around
 */
class State extends EventEmitter {
  #development = false;
  fileWatcher;
  logger;
  extensions;
  localFiles;
  config;
  constructor({ development = false }) {
    super();
    this.#development = development;
  }
}

class FileWatcher {}
class Extensions {}
class Files {}
class Config {}
