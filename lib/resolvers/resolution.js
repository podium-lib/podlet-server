/**
 * @typedef {Object} ResolutionOptions
 * @property {function} [server]
 * @property {function} [config]
 * @property {function} [build]
 * @property {function} [document]
 */

export default class Resolution {
  server;

  config;

  build;

  document;

  meta;

  /**
   * @param {ResolutionOptions} options
   */
  constructor({ server, config, build, document }, meta = {}) {
    this.server = server;
    this.config = config;
    this.build = build;
    this.document = document;
    this.meta = meta;
  }
}
