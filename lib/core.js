import { schema } from "./config-schema.js";
import serverPlugin from "./plugin.js";

export class Core {
  server = [];
  config = [];
  build = [];
  document = [];

  static async load() {
    const core = new Core();
    core.config.push(schema);
    core.server.push(serverPlugin);
    return core;
  }
}
