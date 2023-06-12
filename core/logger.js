import { pino } from "pino";

export class Logger {
  #context;
  #log;

  /**
   * @param {import("./context").Context} context
   */
  constructor(context) {
    this.#context = context;
    const level = this.#context.config.has("app.logLevel")
      ? this.#context.config.get("app.logLevel").toLowerCase()
      : null;
    if (this.#context.development) {
      this.#context.config.get("app.logLevel").toLowerCase();
      this.#log = pino({
        transport: { target: "./pino-dev-transport.js" },
        level: level || "debug",
      });
    } else {
      this.#log = pino({ level: level || "info" });
    }
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  info(obj, msg, ...args) {
    this.#log.info(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  error(obj, msg, ...args) {
    this.#log.error(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  warn(obj, msg, ...args) {
    this.#log.warn(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  debug(obj, msg, ...args) {
    this.#log.debug(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  trace(obj, msg, ...args) {
    this.#log.trace(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  fatal(obj, msg, ...args) {
    this.#log.fatal(obj, msg, ...args);
  }
  /**
   * @param {any} obj
   * @param {string | undefined} msg
   * @param {any[]} args
   */
  silent(obj, msg, ...args) {
    return this.#log.silent(obj, msg, ...args);
  }
  /**
   * @param {pino.Bindings} bindings
   * @param {object} [options]
   * @returns
   */
  child(bindings, options) {
    return this.#log.child(bindings, options);
  }

  get level() {
    return this.#log.level;
  }
}
