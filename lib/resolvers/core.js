import Resolution from "./resolution.js";
import { schema } from "../config-schema.js";
import serverPlugin from "../plugin.js";

export class Core {
  static async load() {
    return new Resolution(
      {
        config: async () => schema,
        server: serverPlugin,
      },
      { name: "core" }
    );
  }
}
