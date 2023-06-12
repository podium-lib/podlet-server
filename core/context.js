import { EventEmitter } from "node:events";

/**
 * Wrapper around server components that can be passed around
 */
export class Context extends EventEmitter {
  /**
   * @type {import("./watcher").FileWatcher}
   */
  fileWatcher;

  /**
   * @type {import("./logger").Logger}
   */
  logger;

  /**
   * @type {import("./extensions").Extensions}
   */
  extensions;

  /**
   * @type {import("./files").Files}
   */
  files;

  /**
   * @type {import("./config").Config}
   */
  config;

  /**
   * @type {boolean}
   */
  development = false;

  /**
   * @type {string}
   */
  cwd;

  /**
   * @type {string[]}
   */
  extensionLoadPaths;

  /**
   * This class is created and then threaded through the application to provide a way for
   * state to be shared between components in a structured way.
   *
   * @param {{development: boolean, cwd: string, extensionLoadPaths: string[]}} options
   */
  constructor({ development = false, cwd, extensionLoadPaths }) {
    super();
    this.development = development;
    this.cwd = cwd;
    this.extensionLoadPaths = extensionLoadPaths;
  }
}
