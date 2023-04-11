export default class Extension {
  /** @type {function | null} */
  server = null;
  /** @type {function | null} */
  config = null;
  /** @type {function | null} */
  build = null;
  /** @type {function | null} */
  document = null;
  meta = {};

  /**
   * @typedef {Object} ExtensionOptions
   * @property {function} [server]
   * @property {function} [config]
   * @property {function} [build]
   * @property {function} [document]
   */

  /**
   *
   * @param {ExtensionOptions} options
   * @param {*} meta
   */
  constructor({ server, config, build, document } = {}, meta) {
    this.meta = meta;
    if (server) {
      this.server = server;
    }
    if (config) {
      this.config = config;
    }
    if (build && typeof build === "function") {
      this.build = build();
    }
    if (document) {
      this.document = document;
    }
  }
}
