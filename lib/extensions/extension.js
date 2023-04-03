export default class Extension {
  server = null;
  config = null;
  build = [];
  document = null;
  meta = {};

  constructor({ server = null, config = null, build = null, document = null } = {}, meta) {
    this.meta = meta;
    if (server) {
      this.server = server;
    }
    if (config) {
      this.config = config;
    }
    if (build) {
      this.build = build;
    }
    if (document) {
      this.document = document;
    }
  }
}
